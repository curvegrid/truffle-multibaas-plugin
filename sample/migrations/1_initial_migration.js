const Migrations = artifacts.require("Migrations");

const { Deployer } = require("truffle-multibaas-plugin");

module.exports = async function(_deployer, network) {
  const deployer = new Deployer(_deployer, network);
  await deployer.setup();

  await deployer.deploy(Migrations);
};
