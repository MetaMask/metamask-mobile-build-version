import { getInput, setFailed, setOutput } from '@actions/core';
import { context, getOctokit } from '@actions/github';

async function main() {
  try {
    const accessToken = getInput('github-token');
    const { owner, repo } = context.repo;

    // Url is taken based on GITHUB_API_URL
    const client = getOctokit(accessToken);

    console.log('Hello World printing from metamask-mobile-build-version');

    const buildVersion = "1400";

    console.log(`Build version: ${buildVersion}`);


    setOutput('build-version',buildVersion);

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