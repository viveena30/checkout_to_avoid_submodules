import * as core from '@actions/core';
import * as coreCommand from '@actions/core/lib/command';
import * as gitSourceProvider from './git-source-provider';
import * as inputHelper from './input-helper';
import * as path from 'path';
import * as stateHelper from './state-helper';
import * as fs from 'fs';
import {getInputs} from './input-helper';
async function run(): Promise<void> {
  try {
    const submodulesCSV = (await inputHelper.getInputs()).submodulesCSV;
  
    // Check if submodulesCSV exists and process submodules
    if (submodulesCSV) {
      const csvFilePath = './BranchSwitchListTest.csv'; // Path to CSV file
      const csvContent = fs.readFileSync(csvFilePath, 'utf8');
      const rows = csvContent.split('\n').map(row => row.trim()).filter(row => row.length > 0);

      for (let i = 1; i < rows.length; i++) { // Assuming first row is a header
        const columns = rows[i].split(',').map(col => col.trim());
        if (columns.length < 2) continue; // Skip invalid rows

        const SubmoduleRepoName = columns[0];
        const repositoryRef = columns[1];
        
        const submoduleSource = await inputHelper.getInputs()

        let repositoryOwner;
        let repositoryName;

        if (SubmoduleRepoName.includes('/')){
          [submoduleSource.repositoryOwner, submoduleSource.repositoryName] = SubmoduleRepoName.split('/');
        } else {
          submoduleSource.repositoryName = SubmoduleRepoName
        }

        try {
          // Register problem matcher again
          coreCommand.issueCommand(
            'add-matcher',
            {},
            path.join(__dirname, 'problem-matcher.json')
          );

          await gitSourceProvider.getSource(submoduleSource)
          core.setOutput('ref', submoduleSource.ref)

          // Get sources for submodules
          await gitSourceProvider.getSource(sourceSubmoduleSettings);
          core.setOutput('ref', sourceSubmoduleSettings.ref);
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