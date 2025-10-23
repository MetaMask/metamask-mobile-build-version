import { getInput, setFailed, setOutput } from '@actions/core';
import { context } from '@actions/github';
import { Storage } from './storage';
import { GitHubContext } from './types';
import { LockManager, LockHandle } from './lock-manager';

function getNumberInput(inputName: string, defaultValue: number): number {
  const rawValue = getInput(inputName);

  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number(rawValue);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric input provided for ${inputName}: ${rawValue}`);
  }

  return parsed;
}

// Main function
async function main() {
  try {
    // Get the github action inputs
    const buildVersionTable = getInput('build-version-table');
    const versionKey = getInput('build-version-key');
    const lockTable = getInput('lock-table') || 'metamask-mobile-build-version-lock';
    const lockKey = getInput('lock-key') || `${buildVersionTable}#${versionKey}`;
    const lockLeaseDurationSeconds = getNumberInput('lock-lease-duration-seconds', 60);
    const lockWaitTimeoutSeconds = getNumberInput('lock-wait-timeout-seconds', 300);
    const lockPollIntervalSeconds = getNumberInput('lock-poll-interval-seconds', 5);

    // Get the github context
    const githubContext = {
      eventName: context.eventName,
      sha: context.sha,
      ref: context.ref,
      actor: context.actor,
      runNumber: context.runNumber,
      runId: context.runId,
      workflow: context.workflow,
      repository: context.repo.repo,
      organization: context.repo.owner,
    };

    const storage = new Storage(buildVersionTable);
    const lockManager = new LockManager(lockTable);
    let lockHandle: LockHandle | undefined;

    try {
      lockHandle = await lockManager.acquireLock({
        lockKey,
        owner: `${githubContext.runId}`,
        leaseDurationSeconds: lockLeaseDurationSeconds,
        waitTimeoutSeconds: lockWaitTimeoutSeconds,
        pollIntervalSeconds: lockPollIntervalSeconds,
      });
    } catch (error) {
      throw new Error(
        `Unable to acquire lock '${lockKey}'. Ensure no other pipeline is incrementing the build version. ${String(error)}`,
      );
    }

    try {
      const currentVersion = await storage.getCurrentVersion(versionKey);
      console.log(
        `Verifying lock ownership for '${lockHandle.lockKey}' prior to updating version '${versionKey}'.`,
      );
      await lockManager.assertLockOwnership(lockHandle);

      console.log(
        `Current version number retrieved: ${currentVersion.versionNumber} for version key ${currentVersion.versionKey}`,
      );
      console.log(`Last Updated at : ${currentVersion.updatedAt}`);
      printContext(currentVersion.githubContext);

      const newVersion = currentVersion;

      //Increment Version & Meta Data
      newVersion.versionNumber = currentVersion.versionNumber + 1;
      newVersion.updatedAt = new Date().toISOString();
      newVersion.githubContext = githubContext;
      newVersion.versionKey = currentVersion.versionKey;

      // Update the build version information
      const updatedVersion = await storage.updateVersion(newVersion);

      console.log(
        `Updated version number: ${updatedVersion.versionNumber} for version key ${updatedVersion.versionKey}`,
      );
      console.log(`Last Updated at : ${updatedVersion.updatedAt}`);
      printContext(updatedVersion.githubContext);

      // Set the output for the build version for use by downstream actions/workflows
      setOutput('build-version', updatedVersion.versionNumber.toString());
    } finally {
      if (lockHandle) {
        await lockManager.releaseLock(lockHandle.lockKey, lockHandle.owner);
      }
    }
    
  } catch (error) {
    const reason =
      error instanceof Error
        ? error
        : typeof error?.toString() === 'function'
        ? error.toString()
        : 'Unknown issue occurred';

    setFailed(reason);
  }
}

// Print the GitHub context for the pipeline
function printContext(githubContext?: GitHubContext): void {

  if (githubContext) {
      console.log(`Created By : ${githubContext.actor}`);
      console.log(`For Github Ref : ${githubContext.ref}`);
      console.log(`For Github SHA : ${githubContext.sha}`);
      console.log(`For Github Run ID : ${githubContext.runId}`);
      console.log(`For Github Run Number : ${githubContext.runNumber}`);
      console.log(`For Github Event Name : ${githubContext.eventName}`);
      console.log(`For Github Workflow : ${githubContext.workflow}`);
      console.log(`For Github Repository : ${githubContext.repository}`);
  } else {
      console.log("No GitHub context available.");
  }
}


main();
