const { authorizeFeature } = require("./access");
const { evaluateFounderEntitlement } = require("./founderEntitlement");

function authorizeFounder(auth) {
  return authorizeFeature(auth, userId => evaluateFounderEntitlement(auth.client, userId));
}

module.exports = { authorizeFounder };
