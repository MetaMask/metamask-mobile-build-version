import { getInput, setFailed, setOutput } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { Storage } from './storage';

async function main() {

  try {

    const accessToken = getInput('github-token');
    const tableName = getInput('build-version-table-name');

    const { owner, repo } = context.repo;

    const githubContext = {
      eventName: context.eventName,
      sha: context.sha,
      ref: context.ref,
      actor: context.actor,
      runNumber: context.runNumber,
      runId: context.runId
    };

    // Url is taken based on GITHUB_API_URL
    const client = getOctokit(accessToken);

    console.log('Hello World printing from metamask-mobile-build-version');

    const buildVersion = "1400";

    console.log(`Build version: ${buildVersion}`);




    const storage = new Storage(tableName);

    // Attempt to get the current version
    const currentVersion = await storage.getCurrentVersion();

    console.log(`Current version number retrieved: ${currentVersion.version}`);
    console.log(`Last Updated at : ${currentVersion.updatedAt}`);
    console.log(`Created By : ${currentVersion.githubContext?.actor}`);
    console.log(`For Github Ref : ${currentVersion.githubContext?.ref}`);
    console.log(`For Github SHA : ${currentVersion.githubContext?.sha}`);
    console.log(`For Github Run ID : ${currentVersion.githubContext?.runId}`);
    console.log(`For Github Run Number : ${currentVersion.githubContext?.runNumber}`);
    console.log(`For Github Event Name : ${currentVersion.githubContext?.eventName}`);


    const newVersion = currentVersion

    //Increment Version & Meta Data
    newVersion.version = currentVersion.version + 1;
    newVersion.updatedAt = new Date().toISOString();
    newVersion.githubContext = githubContext;
    newVersion.versionKey = 'metamask-mobile';

    const updatedVersion = await storage.updateVersion(newVersion);

    console.log(`Updated version number: ${updatedVersion.version}`);
    console.log(`Last Updated at : ${updatedVersion.updatedAt}`);
    console.log(`Created By : ${updatedVersion.githubContext?.actor}`);
    console.log(`For Github Ref : ${updatedVersion.githubContext?.ref}`);
    console.log(`For Github SHA : ${updatedVersion.githubContext?.sha}`);
    console.log(`For Github Run ID : ${updatedVersion.githubContext?.runId}`);
    console.log(`For Github Run Number : ${updatedVersion.githubContext?.runNumber}`);
    console.log(`For Github Event Name : ${updatedVersion.githubContext?.eventName}`);



    setOutput('build-version', updatedVersion.version.toString());

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

main();