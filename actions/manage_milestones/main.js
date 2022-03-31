// The expection is that this action runs on the day the Milestone is due or after.
// If the milestone date has already past, this script will take the oldest one
// and do the work of closing that out
//
const core = require('@actions/core');
const { graphql } = require('@octokit/graphql');
const { Octokit } = require('@octokit/core');

const main = async function() {

  try {
    const token = core.getInput('repo-token');
    const octokit = new Octokit({ auth: token });

    const orgRepo = core.getInput('org-repo');
    const [org, repo] = orgRepo.split("/");

    // MilestoneNodeId needs to be the node id. Not the integer number in the
    // repository
    const milestoneNodeId = core.getInput('milestone-node-id');

    const nextMilestoneNodeId = core.getInput('next-milestone-node-id');

    // project node id is the node id of projectNext. This is used to make
    // sure that we're pointing to the correct roadmap board.
    const projectNodeId = core.getInput('project-node-id');

    const graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ` + token,
      },
    });

    // Steps
    // - Find all of the issues in repository tagged to a specific milestone
    // - For all issues that are closed in milestone, delete those cards on the board.
    //     The new github projects boards dont have API calls for archiving the cards.
    // - For all issues that are open in the milestone, move them to the next milestone
    const milestoneIssueQuery = `
      query findIssues($milestoneNodeId: ID!, $first: Int = 50, $afterCursor: String = "") {
        node(id: $milestoneNodeId) {
          ... on Milestone {
            number
            issues(first: $first, after: $afterCursor) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                title
                number
                state
                projectNextItems(first: 50) {
                  nodes {
                    id
                    project {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const removeIssueFromBoard = `
      mutation removeIssue($project: ID!, $projectNextItem: ID!) {
        deleteProjectNextItem(
          input: {
            projectId: $project
            itemId: $projectNextItem
          }
        ) {
          deletedItemId
        }
      }
    `;


    const updateIssueMilestone = `
      mutation changeMilestone($issueNodeId: ID!, $milestone: ID!) {
        updateIssue(
          input: {
            id: $issueNodeId,
            milestoneId: $milestone
          }
        ) {
          clientMutationId
        }
      }
    `;

    // Find all of the issues with their associated project next projects
    // If the project id is a match
    //   if the issue is closed, delete issue from project next
    //
    var stop = false;
    var parameters = {
      milestoneNodeId: milestoneNodeId,
      afterCursor: ''
    };
    var milestoneNumber = 0;

    do {
      core.info('Getting Issues on Milestone ' + milestoneNodeId);

      var response = await graphqlWithAuth(milestoneIssueQuery, parameters);
      core.debug('Retrieved Milestones: ' + JSON.stringify(response));

      milestoneNumber = response["node"]["number"];
      var issues = response["node"]["issues"]["nodes"];
      var pageInfo = response["node"]["issues"]["pageInfo"];

      for(var i = 0; i < issues.length; i++) {

        // Make sure that the issue is part of the project that we want to delete it from
        if (issues[i]["projectNextItems"]["nodes"].length > 0) {
          var project = issues[i]["projectNextItems"]["nodes"].find(x => x.project.id === projectNodeId);

          if (project && issues[i]["state"] === "CLOSED") {

            // For all of the issues that are closed, ideally we'd archive them on the board
            // but projectNext projects dont have that capability yet via GraphQL or REST APIs.
            // So we're going to delete them from the board.
            //
            core.info("Issue Deleted From Roadmap: " + issues[i]["id"]);
            var removeResponse = await graphqlWithAuth(removeIssueFromBoard, { project: projectNodeId, projectNextItem: project["id"] });


          } else if (issues[i]["state"] === "OPEN") {

            // The behavior in the graphql api is that you can only have one milestone.
            // By setting it here, the other will get removed.
            //
            core.info("Issue Moved to Next Milestone: " + issues[i]["id"]);
            await graphqlWithAuth(updateIssueMilestone, { issueNodeId: issues[i]["id"] , milestone: nextMilestoneNodeId });

          } else {
            // do nothing
            core.info("Issue Closed. Skipped: " + issues[i]["id"]);
          }

        }
      }

      // If hasNextPage is false, then stop processing responses
      if (!pageInfo["hasNextPage"]) {
        stop = true
      } else {
        parameters["afterCursor"] = pageInfo["endCursor"];
      }
    } while(!stop)


    // Finally Close the Milestone
    //
    response = await octokit.request("PATCH /repos/{owner}/{repo}/milestones/{milestone_number}", {
        headers: {
            authorization: "Bearer " + token.token,
          },
        owner: org,
        repo: repo,
        milestone_number: milestoneNumber,
        state: 'closed'
    })

    //if request failed
    if(response.status != 200) {
        core.error('Failed Response: ' + JSON.stringify(response));
        core.setFailed(`Milestone cannot be closed, github responded with an invalid status (${response.status}).`)
        reject();
        return;
    }

  } catch (error) {
    core.setFailed(error.message);
  }

}
main();
