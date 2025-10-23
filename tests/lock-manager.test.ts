import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  ConditionalCheckFailedException,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { LockManager, AcquireLockOptions, LockHandle } from '../src/lock-manager';
import { mockClient } from 'aws-sdk-client-mock';

const LOCK_TABLE = 'lock-table';
const LOCK_KEY = 'lock-key';
const OWNER = 'owner-123';

describe('LockManager', () => {
  const dynamoMock = mockClient(DynamoDBClient);

  beforeEach(() => {
    dynamoMock.reset();
  });

  const buildLockManager = () => new LockManager(LOCK_TABLE, new DynamoDBClient({}));

  describe('acquireLock', () => {
    it('acquires the lock when no existing item is present', async () => {
      dynamoMock.on(PutItemCommand).resolves({});

      const manager = buildLockManager();
      const options: AcquireLockOptions = {
        lockKey: LOCK_KEY,
        owner: OWNER,
        leaseDurationSeconds: 60,
        waitTimeoutSeconds: 1,
        pollIntervalSeconds: 1,
      };

      const result = await manager.acquireLock(options);

      expect(result.lockKey).toBe(LOCK_KEY);
      expect(result.owner).toBe(OWNER);
      expect(result.expiresAtEpochSeconds).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('polls until lock becomes available', async () => {
      const conditionalError = new ConditionalCheckFailedException({ message: 'exists' });
      dynamoMock
        .on(PutItemCommand)
        .rejectsOnce(conditionalError)
        .resolves({});

      dynamoMock.on(GetItemCommand).resolves({
        Item: {
          lockKey: { S: LOCK_KEY },
          holder: { S: 'other-owner' },
          expiresAt: { N: (Math.floor(Date.now() / 1000) + 60).toString() },
        },
      });

      const manager = buildLockManager();
      const options: AcquireLockOptions = {
        lockKey: LOCK_KEY,
        owner: OWNER,
        leaseDurationSeconds: 60,
        waitTimeoutSeconds: 2,
        pollIntervalSeconds: 1,
      };

      const result = await manager.acquireLock(options);
      expect(result.owner).toBe(OWNER);
    });

    it('throws when timeout elapses without acquiring lock', async () => {
      dynamoMock.on(PutItemCommand).rejects(new ConditionalCheckFailedException({}));
      dynamoMock.on(GetItemCommand).resolves({});

      const manager = buildLockManager();
      const options: AcquireLockOptions = {
        lockKey: LOCK_KEY,
        owner: OWNER,
        leaseDurationSeconds: 60,
        waitTimeoutSeconds: 1,
        pollIntervalSeconds: 1,
      };

      await expect(manager.acquireLock(options)).rejects.toThrow(
        /Timed out after waiting 1s to acquire lock/,
      );
    });
  });

  describe('releaseLock', () => {
    it('deletes the lock item when held by owner', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      dynamoMock.on(DeleteItemCommand).resolves({});

      const manager = buildLockManager();
      await manager.releaseLock(LOCK_KEY, OWNER);

      expect(consoleSpy).toHaveBeenCalledWith(`Lock '${LOCK_KEY}' released by '${OWNER}'.`);
      consoleSpy.mockRestore();
    });
  });

  describe('assertLockOwnership', () => {
    it('throws if lock record is missing', async () => {
      dynamoMock.on(GetItemCommand).resolves({});

      const manager = buildLockManager();
      const handle: LockHandle = {
        lockKey: LOCK_KEY,
        owner: OWNER,
        expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 60,
      };

      await expect(manager.assertLockOwnership(handle)).rejects.toThrow(
        /no longer present/,
      );
    });

    it('throws if holder does not match', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: {
          lockKey: { S: LOCK_KEY },
          holder: { S: 'other-owner' },
          expiresAt: { N: (Math.floor(Date.now() / 1000) + 60).toString() },
        },
      });

      const manager = buildLockManager();
      const handle: LockHandle = {
        lockKey: LOCK_KEY,
        owner: OWNER,
        expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 60,
      };

      await expect(manager.assertLockOwnership(handle)).rejects.toThrow(/now held by/);
    });

    it('throws if lock expired', async () => {
      dynamoMock.on(GetItemCommand).resolves({
        Item: {
          lockKey: { S: LOCK_KEY },
          holder: { S: OWNER },
          expiresAt: { N: (Math.floor(Date.now() / 1000) - 1).toString() },
        },
      });

      const manager = buildLockManager();
      const handle: LockHandle = {
        lockKey: LOCK_KEY,
        owner: OWNER,
        expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 60,
      };

      await expect(manager.assertLockOwnership(handle)).rejects.toThrow(/has expired/);
    });

    it('passes when holder matches and lock valid', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      dynamoMock.on(GetItemCommand).resolves({
        Item: {
          lockKey: { S: LOCK_KEY },
          holder: { S: OWNER },
          expiresAt: { N: (Math.floor(Date.now() / 1000) + 60).toString() },
        },
      });

      const manager = buildLockManager();
      const handle: LockHandle = {
        lockKey: LOCK_KEY,
        owner: OWNER,
        expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 60,
      };

      await manager.assertLockOwnership(handle);

      expect(consoleSpy).toHaveBeenCalledWith(
        `Lock ownership verified for '${LOCK_KEY}'. Holder '${OWNER}' matches the lock record.`,
      );
      consoleSpy.mockRestore();
    });
  });
});

