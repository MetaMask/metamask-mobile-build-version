# metamask-mobile-build-version

---
<br><br>
<img src="/.github/images/github-actions.png" alt="Github Actions Icon" width="150" height="150">
<img src="/.github/images/aws.png" alt="AWS Icon" width="150" height="150"><br>

This repository contains an internal tool designed for generating build versions specifically tailored for the Metamask Mobile project. It automates the management of the versioning process, ensuring consistency and traceability across builds.

## Overview

The Metamask Mobile Build Version Generator is a GitHub Action designed to automate the creation of build version numbers for the Metamask Mobile app. This tool integrates seamlessly into CI/CD pipelines, facilitating a robust build process.
The Github action leverages a persistence data store across all feature/release branches such that the build versioning can be coordinated & consistent. This action leverages the Github OIDC JsonWebToken to authenticate to AWS leveraging STS and with the least privledged IAM role is able to manage the Dynamodb Backend.

## Features

- **Automatic Version Generation:** Streamlines the versioning process for new builds.
- **AWS Integration:** Securely interacts with AWS services to store and manage version data.
- **Local Testing Support:** Includes the capability to test GitHub Actions locally using `act`, ensuring changes are validated before deployment.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) - Runtime
- [act](https://github.com/nektos/act) - For local testing of GitHub Actions.

## Installation

To set up this GitHub Action in your repository, follow these steps:

1. **Clone the repository:**
```bash
git clone https://github.com/your-repository/metamask-mobile-build-version.git
```

2. **Navigate to the project directory:**

```bash
cd metamask-mobile-build-version
```

3. **Install dependencies (if any):**

```bash
npm install
```

## Usage

To use the build version generator, incorporate it into your GitHub Actions workflow by referencing it in your workflow file.

***Example Workflow***

```yaml
name: Generate Latest Build Version

on:
  push:
    branches:
      - "**"

permissions:
  contents: read
  id-token: write

jobs:
  generate-build-version:
    uses: MetaMask/metamask-mobile-build-version/.github/workflows/metamask-mobile-build-version.yml@v1.0.0

  process-output:
    needs: generate-build-version
    runs-on: ubuntu-latest
    steps:
      - name: Print latest build version
        run: echo "The build version from the first job was ${{ needs.generate-build-version.outputs.build-version }}"
```

## Testing Locally
To test the GitHub Action locally, install act and run the following command:

```bash
brew install act
```

1. **Access the Okta AWS Tool:** Use the [Okta AWS Tool](https://d-906760031f.awsapps.com/start/#/?tab=accounts) to generate AWS credentials 
2. **Configure Credentials Locally:** Once you have your credentials, set them up in your local environment:
```bash
export AWS_ACCESS_KEY_ID=<Your-Access-Key-ID>
export AWS_SECRET_ACCESS_KEY=<Your-Secret-Access-Key>
export AWS_SESSION_TOKEN=<Your-Session-Token> 
```

3. **Run the action locally:**

```bash
act -W '.github/workflows/local-act-testing.yml' --secret AWS_ACCESS_KEY_ID=$(echo $AWS_ACCESS_KEY_ID) --secret AWS_SECRET_ACCESS_KEY=$(echo $AWS_SECRET_ACCESS_KEY) --secret AWS_REGION=us-east-2 --secret AWS_SESSION_TOKEN=$(echo $AWS_SESSION_TOKEN)
```

## Preparing Your Action for Use

Before committing your GitHub Action, make sure to run the build process and check in the required files. This step is crucial because GitHub Actions for JavaScript require the built code to be in the repository.

### Build and Check-in

1. **Build your project**:
Ensure that your latest changes are compiled or transpiled into JavaScript that GitHub can execute. Run the following

```bash
npm run build
```

#### Bumping the Version

There is a self reference in the workflow *metamask-mobile-build-version.yml* so make sure you update the reference 
along with the package.json when creating new versions

#### Backend and Infrastructure

The backend for this action relies on **DynamoDB**, and the dependent AWS infrastructure is provisioned and managed through a specific GitHub repository. For more details on the infrastructure setup, configurations, and management, refer to the following repository:

- [ConsenSys Vertical Apps / Metamask Mobile Infra](https://github.com/consensys-vertical-apps/metamask-mobile-infra)

This repository contains all the necessary infrastructure as Code to provision the Tables/Roles this action interacts with to securely manage the build version.