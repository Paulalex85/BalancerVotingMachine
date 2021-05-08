const {expect} = require('chai');
const {constants, time, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const BigNumber = require('bignumber.js');
const VotingMachine = artifacts.require('VotingMachine');

const {toWei} = web3.utils;

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
        stakeAmount = toWei('100');
        halfStake = toWei('50');
        quarterStake = toWei('25');
        irregularStake = toWei('33');
        irregularStake2 = toWei('76');
        tinyStake = toWei('9');
    });
    context('# contract initialization', async () => {
        it('balancer LP token should be defined', async () => {
            expect(await setup.votingMachine.balancerLPToken()).to.equal(setup.balancer.pool.address);
        });
        it('contract revert when balancer pool not defined', async () => {
            await expectRevert(VotingMachine.new(constants.ZERO_ADDRESS), "VotingMachine: LP token cannot be null");
        });
    });
    context('# stake lp token', async () => {
        it('amount should be > 0', async () => {
            await expectRevert(setup.votingMachine.stake(0), "VotingMachine: cannot stake 0");
        });
        it('should approve before stake', async () => {
            await setup.balancer.pool.transfer(accounts[1], stakeAmount);
            await expectRevert(setup.votingMachine.stake(stakeAmount, {from: accounts[1]}), "ERR_PCTOKEN_BAD_CALLER");
        });
        it('should approve enough', async () => {
            await setup.balancer.pool.transfer(accounts[1], stakeAmount);
            await setup.balancer.pool.approve(setup.votingMachine.address, halfStake, {from: accounts[1]});
            await expectRevert(setup.votingMachine.stake(stakeAmount, {from: accounts[1]}), "ERR_PCTOKEN_BAD_CALLER");
        });
        it('can stake token', async () => {
            await setup.balancer.pool.transfer(accounts[1], stakeAmount);
            await setup.balancer.pool.approve(setup.votingMachine.address, stakeAmount, {from: accounts[1]});
            let tx = await setup.votingMachine.stake(stakeAmount, {from: accounts[1]})
            setup.data.tx = tx;

            expect((await setup.votingMachine.balanceOf(accounts[1])).toString()).to.equal(stakeAmount);
            await expectEvent.inTransaction(setup.data.tx.tx, setup.votingMachine, 'Staked', {
                user: accounts[1],
                amount: stakeAmount
            });
        });
    });
});