// The expection is that this action runs on the day the Milestone is due or after.
// If the milestone date has already past, this script will take the oldest one
// and do the work of closing that out
//
const core = require('@actions/core');
const { graphql } = require('@octokit/graphql');

const main = async function() {

  try {
    const token = core.getInput('repo-token');
    const project = core.getInput('project');
    const cycle_length = core.getInput('cycle_length');
    const planned_versions = core.getInput('planned_versions');

    const graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ` + token,
      },
    });

    core.info('Finding Oldest Milestone');


    core.info('Finding Issue for Oldest Milestone')
    var project_next_items = await graphqlWithAuth(`
      query findIssues() {

      }
    `,{
      project: project
    });

    core.info('Removing')


    /*
    const nodes = project_next_item["node"]["projectNextItems"]["nodes"];
    var found_id = "";

    core.debug("Nodes: " + JSON.stringify(nodes));
    if (nodes === undefined) {
      core.info("Couldn't find issue (" + issue_node_id + ") on project (" + project + ")");
      process.exit(0);
    }

    for(let node_id = 0; node_id < nodes.length; node_id++) {
      if (nodes[node_id]["project"]["id"] === project) {
        found_id = nodes[node_id]["id"];
      }
    }

    if (found_id.length > 1) {
      core.info("Deleting Project Issue: " + issue_node_id);
      await graphqlWithAuth(`
        mutation($project:ID!, $issue:ID!) {
          deleteProjectNextItem(input: {projectId: $project, itemId: $issue}) {
            deletedItemId
          }
        }
      `,
      {
        project: project,
        issue: found_id,
      })
    } else {
      core.info("Couldnt find issue " + issue_node_id + " on Project " + project);
    }
    */
  } catch (error) {
    core.setFailed(error.message);
  }

}
main();
