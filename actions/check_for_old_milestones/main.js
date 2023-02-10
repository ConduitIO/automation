// The expection is that this action runs on the day the Milestone is due or after.
// If the milestone date has already past, this script will take the oldest one
// and do the work of closing that out
//
const core = require('@actions/core');
const { graphql } = require('@octokit/graphql');

const main = async function() {

  try {
    const token = core.getInput('repo-token');
    const orgRepo = core.getInput('org-repo');
    const [org, repo] = orgRepo.split("/");

    const graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ` + token,
      },
    });

    core.info('Getting Milestones');
    var response = await graphqlWithAuth(`
      query findMilestones($org: String!, $repo: String!) {
        repository(owner: $org, name: $repo) {
          milestones(first: 10, states: OPEN, orderBy: {field: DUE_DATE, direction: ASC}) {
            nodes {
              id
              title
              dueOn
              closed
            }
          }
        }
      }
    `,{
      org: org,
      repo: repo
    });

    core.debug('Retrieved Milestones: ' + JSON.stringify(response));

    core.info('Searching Milestones');

    var foundIndex = -1;
    var currentDate = new Date();
    var milestones = response["repository"]["milestones"]["nodes"];

    for (var i = 0; i < milestones.length; i++) {
      // Skip Milestones that don't have a due date.
      // This is the `Future` milestone
      if (milestones[i]["dueOn"] !== null) {
        var milestoneDueOn = new Date(milestones[i]["dueOn"]);
        if (currentDate >= milestoneDueOn && foundIndex == -1) {
          foundIndex = i;
          core.info('Found Milestone: ' + json.stringify(milestones[i]));
        }
      }
    }

    if (foundIndex == -1) {
      core.setOutput("found", false);
      core.notice("Found no milestones to close");

      // Don't throw a failed because well constantly get notified any time
      // the action step is in error.
      //core.setFailed('Didnt find any milestones to release');
    } else {
      core.setOutput("found", true);
      core.setOutput("milestone-node-id", milestones[foundIndex]["id"]);

      // We assume that all of the milestones are in order by due date. The "future"
      // milestone is the only one that doesn't have a due date. We also assume that
      // there's another milestone before that. If not, we're going to error.
      //
      if (milestones[foundIndex + 1]) {
        core.setOutput("next-milestone-node-id", milestones[foundIndex + 1]["id"]);
      } else {
        core.setFailed("A next milestone does not exist. Please create one.");
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }

}
main();
