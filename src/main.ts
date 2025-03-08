import * as core from '@actions/core';
import * as coreCommand from '@actions/core/lib/command';
import * as gitSourceProvider from './git-source-provider';
import * as inputHelper from './input-helper';
import * as path from 'path';
import * as stateHelper from './state-helper';
import * as fs from 'fs';

async function run(): Promise<void> {
  try {
    const sourceSettings = await inputHelper.getInputs();
    try {
      // Register problem matcher
      coreCommand.issueCommand(
        'add-matcher',
        {},
        path.join(__dirname, 'problem-matcher.json')
      );

      // Get main sources
      await gitSourceProvider.getSource(sourceSettings);
      core.setOutput('ref', sourceSettings.ref);
    } finally {
      // Unregister problem matcher
      coreCommand.issueCommand('remove-matcher', { owner: 'checkout-git' }, '');
    }

    // Check if submodulesCSV exists and process submodules
    if (sourceSettings.submodulesCSV) {
      const csvFilePath = 'BranchSwitchListTest.csv'; // Path to CSV file
      const csvContent = fs.readFileSync(csvFilePath, 'utf8');
      const rows = csvContent.split('\n').map(row => row.trim()).filter(row => row.length > 0);
      const result = {} as IGitSourceSettings

      
      for (let i = 1; i < rows.length; i++) { // Assuming first row is a header
        const columns = rows[i].split(',').map(col => col.trim());
        if (columns.length < 2) continue; // Skip invalid rows

        const SubmoduleRepoName = columns[0];
        // const SubmoduleRef = columns[1];
        // sourceSettings.ref = SubmoduleRef  
        sourceSettings.ref = columns[1]

        core.startGroup(`Getting ref value ${sourceSettings.ref}`)
        core.endGroup()

        if (SubmoduleRepoName.includes('/')){
          [sourceSettings.repositoryOwner, sourceSettings.repositoryName] = SubmoduleRepoName.split('/');
        } else {
          sourceSettings.repositoryName = SubmoduleRepoName
        }

        try {
          // Register problem matcher again
          coreCommand.issueCommand(
            'add-matcher',
            {},
            path.join(__dirname, 'problem-matcher.json')
          );

          // Get sources for submodules
          core.setOutput('ref', sourceSettings.ref);
          await gitSourceProvider.getSource(sourceSettings);
          // sourceSettings.githubServerUrl = columns[1]
          // sourceSettings.repositoryPath = columns[1]
          // sourceSettings.lfs = false
          // sourceSettings.sparseCheckout  = null
          // sourceSettings.authToken = columns[1]
          // // sourceSettings.workflowOrganizationId = columns[1]
          // sourceSettings.nestedSubmodules = false
          // sourceSettings.persistCredentials = true
          // sourceSettings.sshKey = columns[1]
          // sourceSettings.sshKnownHosts = columns[1]
  
        } finally {
          // Unregister problem matcher
          coreCommand.issueCommand('remove-matcher', { owner: 'checkout-git' }, '');
        }
      }
    }
  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`);
  }
}

async function cleanup(): Promise<void> {
  try {
    await gitSourceProvider.cleanup(stateHelper.RepositoryPath);
  } catch (error) {
    core.warning(`${(error as any)?.message ?? error}`);
  }
}

// Main
if (!stateHelper.IsPost) {
  run();
} else {
  cleanup();
}
