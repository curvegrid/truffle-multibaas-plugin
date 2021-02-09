const { Provider } = require("truffle-multibaas-plugin");

const MultiBaasDeploymentID = "<YOUR DEPLOYMENT ID HERE>";
const MultiBaasDeploymentPort = "<YOUR DEPLOYMENT PORT>"; // Optional if you want to use a different port.

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
        MultiBaasDeploymentID,
        MultiBaasDeploymentPort, // Optional if you want to use a different port.
      ),
      network_id: "*",
    },
  },
  //
  multibaasDeployer: {
    apiKeySource: "env",
    deploymentID: MultiBaasDeploymentID,
    deploymentPort: MultiBaasDeploymentPort, // Optional if you want to use a different port.
    allowUpdateAddress: ["development"],
  },
};
