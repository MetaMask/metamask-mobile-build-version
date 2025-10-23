import {
  ConditionalCheckFailedException,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';

export interface LockMeta {
  holder?: string;
  expiresAtEpochSeconds?: number;
}

export interface AcquireLockOptions {
  lockKey: string;
  owner: string;
  leaseDurationSeconds: number;
  waitTimeoutSeconds: number;
  pollIntervalSeconds: number;
}

export interface LockHandle {
  lockKey: string;
  owner: string;
  expiresAtEpochSeconds: number;
}

const MIN_POLL_INTERVAL_SECONDS = 1;

export class LockManager {
  private readonly tableName: string;
  private readonly db: DynamoDBClient;

  constructor(tableName: string, dbClient?: DynamoDBClient) {
    if (!tableName) {
      throw new Error('Lock table name must be provided');
    }

    this.tableName = tableName;
    this.db = dbClient ?? new DynamoDBClient({});
  }

  async acquireLock(options: AcquireLockOptions): Promise<LockHandle> {
    const pollIntervalSeconds = Math.max(
      options.pollIntervalSeconds,
      MIN_POLL_INTERVAL_SECONDS,
    );
    const start = Date.now();

    while (true) {
      const nowEpochSeconds = Math.floor(Date.now() / 1000);
      const leaseExpiryEpochSeconds = nowEpochSeconds + options.leaseDurationSeconds;

      try {
        const command = new PutItemCommand({
          TableName: this.tableName,
          Item: {
            lockKey: { S: options.lockKey },
            holder: { S: options.owner },
            expiresAt: { N: leaseExpiryEpochSeconds.toString() },
          },
          ConditionExpression:
            'attribute_not_exists(lockKey) OR expiresAt < :nowEpochSeconds',
          ExpressionAttributeValues: {
            ':nowEpochSeconds': { N: nowEpochSeconds.toString() },
          },
        });

        await this.db.send(command);

        console.log(
          `Lock '${options.lockKey}' acquired by '${options.owner}' until ${new Date(
            leaseExpiryEpochSeconds * 1000,
          ).toISOString()}.`,
        );

        return {
          lockKey: options.lockKey,
          owner: options.owner,
          expiresAtEpochSeconds: leaseExpiryEpochSeconds,
        };
      } catch (error) {
        if (error instanceof ConditionalCheckFailedException) {
          const lockMeta = await this.describeLock(options.lockKey);

          if (lockMeta) {
            const expiryIso = lockMeta.expiresAtEpochSeconds
              ? new Date(lockMeta.expiresAtEpochSeconds * 1000).toISOString()
              : 'unknown';

            console.log(
              `Lock '${options.lockKey}' currently held by '${
                lockMeta.holder ?? 'unknown'
              }' until ${expiryIso}. Waiting ${pollIntervalSeconds}s before retrying...`,
            );
          } else {
            console.log(
              `Failed to acquire lock '${options.lockKey}'. Lock record not readable; will retry in ${pollIntervalSeconds}s.`,
            );
          }
        } else {
          throw error;
        }
      }

      const elapsedSeconds = (Date.now() - start) / 1000;
      if (elapsedSeconds >= options.waitTimeoutSeconds) {
        throw new Error(
          `Timed out after waiting ${options.waitTimeoutSeconds}s to acquire lock '${options.lockKey}'.`,
        );
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000));
    }
  }

  async releaseLock(lockKey: string, owner: string): Promise<void> {
    try {
      await this.db.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: {
            lockKey: { S: lockKey },
          },
          ConditionExpression: 'holder = :holder',
          ExpressionAttributeValues: {
            ':holder': { S: owner },
          },
        }),
      );
      console.log(`Lock '${lockKey}' released by '${owner}'.`);
    } catch (error) {
      console.warn(
        `Unable to release lock '${lockKey}' for owner '${owner}'. It may have expired or been taken by another process.`,
        error,
      );
    }
  }

  private async describeLock(lockKey: string): Promise<LockMeta | undefined> {
    const response = await this.db.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: {
          lockKey: { S: lockKey },
        },
        ConsistentRead: true,
      }),
    );

    if (!response.Item) {
      return undefined;
    }

    const holder = response.Item.holder?.S;
    const expiresAtRaw = response.Item.expiresAt?.N;
    const expiresAtEpochSeconds = expiresAtRaw ? parseInt(expiresAtRaw, 10) : undefined;

    return {
      holder,
      expiresAtEpochSeconds,
    };
  }
}

