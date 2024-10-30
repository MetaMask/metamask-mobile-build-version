import { getInput, setFailed, setOutput } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { Storage } from './storage';
import { BuildVersion, GitHubContext } from './types';

// Main function
async function main() {
  try {
    // Get the github action inputs
    const accessToken = getInput('github-token');
    const buildVersionTable = getInput('build-version-table');
    const versionKey = getInput('build-version-key');

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

    // Fetch the current build version information.
    const currentVersion = await storage.getCurrentVersion(versionKey);

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
    newVersion.versionKey = 'metamask-mobile';

    // Update the build version information
    const updatedVersion = await storage.updateVersion(newVersion);

    console.log(
      `Updated version number: ${updatedVersion.versionNumber} for version key ${updatedVersion.versionKey}`,
    );
    console.log(`Last Updated at : ${updatedVersion.updatedAt}`);
    printContext(updatedVersion.githubContext);

    // Set the output for the build version for use by downstream actions/workflows
    setOutput('build-version', updatedVersion.versionNumber.toString());
    
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
