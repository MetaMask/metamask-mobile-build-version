/**
 * Represents a build version.
 */
export class BuildVersion {
  versionKey: string; // Partition Key of the DynamoDB table
  versionNumber: number; // Version number ( natural build version )
  updatedAt: string; // Last updated timestamp
  githubContext?: GitHubContext; // GitHub context for the build version

  constructor(
    versionKey: string,
    versionNumber: number,
    updatedAt: string,
    context?: GitHubContext,
  ) {
    this.versionKey = versionKey;
    this.versionNumber = versionNumber;
    this.updatedAt = updatedAt;
    this.githubContext = context;
  }
}

/**
 * Represents the GitHub context for the current action execution
 */
export class GitHubContext {
  eventName: string; // The name of the event that triggered the action
  sha: string; // The commit SHA that triggered the action
  ref: string; // The git ref that triggered the action
  actor: string; // The login of the user that initiated the workflow
  runNumber: number; // The unique number for the run within the repository
  runId: number; // The unique ID for the run within the repository
  workflow: string; // The name of the workflow that the run is using
  organization: string; // The organization that owns the repository
  repository: string; // The name of the repository

  constructor(
    eventName: string,
    sha: string,
    ref: string,
    actor: string,
    runNumber: number,
    runId: number,
    workflow: string,
    organization: string,
    repository: string,
  ) {
    this.eventName = eventName;
    this.sha = sha;
    this.ref = ref;
    this.actor = actor;
    this.runNumber = runNumber;
    this.runId = runId;
    this.workflow = workflow;
    this.organization = organization;
    this.repository = repository;
  }
}
