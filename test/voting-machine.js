const { expect } = require('chai');
const { constants, time, expectEvent } = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const BigNumber = require('bignumber.js');

const { toWei } = web3.utils;

const deploy = async (accounts) => {
    // initialize test setup
    const setup = await helpers.setup.initialize(accounts[0]);
    // deploy ERC20s
    setup.tokens = await helpers.setup.tokens(setup);
    // deploy balancer infrastructure
    setup.balancer = await helpers.setup.balancer(setup);
    //deploy voting machine
    setup.votingMachine = await helpers.setup.votingMachine(setup);

    return setup;
};

contract('VotingMachine', (accounts) => {
    let setup;
    let stakeAmount;
    let halfStake;
    let quarterStake;
    let irregularStake;
    let irregularStake2;
    let tinyStake;

    before('!! deploy setup', async () => {
        setup = await deploy(accounts);
    });
    context('# contract ready', async () => {
        it('balancer pool should be defined', async () => {
            expect(await setup.votingMachine.balancerPool()).to.equal(setup.balancer.pool.address);
        });
    });
});