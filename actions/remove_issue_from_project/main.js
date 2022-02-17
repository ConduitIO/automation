const core = require('@actions/core');
const graphql = require('@octokit/graphql');

(async () => {

  try {
    const token = core.getInput('repo-token');
    const project = core.getInput('project');
    const issue_node_id = core.getInput('issue-node-id');

    const graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ` + token,
      },
    });

    core.debug('LOOKING FOR ISSUE: ' + issue_node_id);
    const {project_next_item} = await graphqlWithAuth(`
      query findIssue($issue_id: ID!) {
        node(id: $issue_id) {
          ... on Issue {
            projectNextItems(first: 100) {
              totalCount
              nodes {
                id
                title
                project {
                  id
                }
              }
            }
          }
        }
      }
    `,
    {
      issue_id: issue_node_id
    });

    core.debug(JSON.stringify(project_next_item));

    const nodes = queryResult["node"]["projectNextItems"]["nodes"];
    var found_id;

    for(let node_id = 0; node_id < nodes.length; node_id++) {
      console.log(JSON.stringify(nodes[node_id]));
      if (nodes[node_id]["project"]["id"] === project) {
        found_id = nodes[node_id]["id"];
      }
    }

    if (found_id.length > 1) {
      console.log("DELETING PROJECT ISSUE: " + issue_node_id);
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
      console.log("COULDNT FIND ISSUE " + issue_node_id + " on Project " + project);
    }

  } catch (error) {
    core.setFailed(error.message);
  }

})();
