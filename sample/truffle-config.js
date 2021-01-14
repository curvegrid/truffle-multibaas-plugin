const { Provider } = require("truffle-multibaas-plugin");

const MultiBaasDeploymentID = "<YOUR DEPLOYMENT ID HERE>";

module.exports = {
  // Uncommenting the defaults below
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    development: {
      provider: new Provider(
        ["<YOUR PRIVATE ETHEREUM KEYS FOR SIGNING HERE>"],
        MultiBaasDeploymentID
      ),
      network_id: "<ETHEREUM NETWORK ID>",
    },
  },
  //
  multibaasDeployer: {
    apiKeySource: "env",
    deploymentID: MultiBaasDeploymentID,
    allowUpdateAddress: ["development"],
  },
};
