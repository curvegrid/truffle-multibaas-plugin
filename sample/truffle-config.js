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
        ["<YOUR API KEY HERE>"],
        MultiBaasDeploymentID,
        0,
        1
      ),
      network_id: "*",
    },
  },
  //
  multibaasDeployer: {
    apiKeySource: "env",
    deploymentID: MultiBaasDeploymentID,
    allowUpdateAddress: ["development"],
  },
};
