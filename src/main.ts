// import * as core from '@actions/core';
// import * as coreCommand from '@actions/core/lib/command';
// import * as gitSourceProvider from './git-source-provider';
// import * as inputHelper from './input-helper';
// import * as path from 'path';
// import * as stateHelper from './state-helper';
// import * as fs from 'fs';
// import {IGitSourceSettings} from './git-source-settings'

// async function run(): Promise<void> {
//   try {
//     const sourceSettings = await inputHelper.getInputs();
//     try {
//       // Register problem matcher
//       coreCommand.issueCommand(
//         'add-matcher',
//         {},
//         path.join(__dirname, 'problem-matcher.json')
//       );

//       // Get main sources
//       await gitSourceProvider.getSource(sourceSettings);
//       core.setOutput('ref', sourceSettings.ref);
//     } finally {
//       // Unregister problem matcher
//       coreCommand.issueCommand('remove-matcher', { owner: 'checkout-git' }, '');
//     }

//     // Check if submodulesCSV exists and process submodules
//     if (sourceSettings.submodulesCSV) {
//       const csvFilePath = 'BranchSwitchListTest.csv'; // Path to CSV file
//       const csvContent = fs.readFileSync(csvFilePath, 'utf8');
//       const rows = csvContent.split('\n').map(row => row.trim()).filter(row => row.length > 0);

      
//       for (let i = 1; i < rows.length; i++) { // Assuming first row is a header
//         const result = {} as IGitSourceSettings
//         const columns = rows[i].split(',').map(col => col.trim());
//         if (columns.length < 2) continue; // Skip invalid rows

//         const SubmoduleRepoName = columns[0];
//         // const SubmoduleRef = columns[1];
//         // sourceSettings.ref = SubmoduleRef  
//         result.ref = columns[1]

//         core.startGroup(`Getting ref value ${result.ref}`)
//         core.endGroup()

//         if (SubmoduleRepoName.includes('/')){
//           [result.repositoryOwner, result.repositoryName] = SubmoduleRepoName.split('/');
//         } else {
//           result.repositoryOwner = sourceSettings.repositoryOwner
//           result.repositoryName = SubmoduleRepoName
//         }

//         try {
//           // Register problem matcher again
//           coreCommand.issueCommand(
//             'add-matcher',
//             {},
//             path.join(__dirname, 'problem-matcher.json')
//           );

//           // Get sources for submodules
//           core.setOutput('ref', result.ref);
//           // result.repositoryPath = sourceSettings.repositoryPath
//           result.repositoryPath = './'
//           result.clean = sourceSettings.clean
//           result.filter = sourceSettings.filter
//           result.submodules = sourceSettings.submodules
//           result.authToken = sourceSettings.authToken
//           result.setSafeDirectory = sourceSettings.setSafeDirectory

//           await gitSourceProvider.getSource(result);
  
//         } finally {
//           // Unregister problem matcher
//           coreCommand.issueCommand('remove-matcher', { owner: 'checkout-git' }, '');
//         }
//       }
//     }
//   } catch (error) {
//     core.setFailed(`${(error as any)?.message ?? error}`);
//   }
// }

// async function cleanup(): Promise<void> {
//   try {
//     await gitSourceProvider.cleanup(stateHelper.RepositoryPath);
//   } catch (error) {
//     core.warning(`${(error as any)?.message ?? error}`);
//   }
// }

// // Main
// if (!stateHelper.IsPost) {
//   run();
// } else {
//   cleanup();
// }


import * as core from '@actions/core';
import * as coreCommand from '@actions/core/lib/command';
import * as gitSourceProvider from './git-source-provider';
import * as inputHelper from './input-helper';
import * as path from 'path';
import * as stateHelper from './state-helper';
import * as fs from 'fs';
import { IGitSourceSettings } from './git-source-settings';

async function run(result: IGitSourceSettings): Promise<void> {
  try {
    // Register problem matcher
    coreCommand.issueCommand('add-matcher', {}, path.join(__dirname, 'problem-matcher.json'));

    // Get main sources
    await gitSourceProvider.getSource(result);
    // core.setOutput('ref', sourceSettings.ref);

  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`);
  } finally {
    // Unregister problem matcher
    coreCommand.issueCommand('remove-matcher', { owner: 'checkout-git' }, '');
  }
}

async function processCSVAndRun(): Promise<void> {
  try {
    const sourceSettings = await inputHelper.getInputs();

    if (sourceSettings.submodulesCSV) {
      const csvFilePath = 'BranchSwitchListTest.csv'; // Path to CSV file
      const csvContent = fs.readFileSync(csvFilePath, 'utf8');
      const rows = csvContent.split('\n').map(row => row.trim()).filter(row => row.length > 0);

      for (let i = 1; i < rows.length; i++) { // Assuming first row is a header
        const columns = rows[i].split(',').map(col => col.trim());
        if (columns.length < 3) continue;

        const submoduleRepoName = columns[0];
        const submoduleRef = columns[1];

        const result = sourceSettings;
        result.repositoryPath = columns[2];
        result.ref = submoduleRef;
        core.setOutput('ref', result.ref);
        core.setOutput('path', result.repositoryPath);
        // result.repositoryPath = sourceSettings.repositoryPath
        result.clean = sourceSettings.clean
        result.filter = sourceSettings.filter
        result.submodules = sourceSettings.submodules
        result.authToken = sourceSettings.authToken
        result.setSafeDirectory = sourceSettings.setSafeDirectory
        // result.repositoryPath = './',
        result.repositoryOwner = submoduleRepoName.includes('/') ? submoduleRepoName.split('/')[0] : sourceSettings.repositoryOwner,
        result.repositoryName = submoduleRepoName.includes('/') ? submoduleRepoName.split('/')[1] : submoduleRepoName

        core.startGroup(`Processing repository ${result.repositoryOwner}/${result.repositoryName} with ref ${result.ref}`);
        core.setOutput('ref', result.ref);
        
        await run(result);
        core.endGroup();
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
  processCSVAndRun();
} else {
  cleanup();
}
