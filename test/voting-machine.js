const {expect} = require('chai');
const {constants, time, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const BigNumber = require('bignumber.js');
const VotingMachine = artifacts.require('VotingMachine');

const {toWei} = web3.utils;

const VoteStatus = {
    NONE: 0,
    ACCEPT: 1,
    REJECT: 2
};

const VotingResult = {
    NONE: 0,
    ACCEPT: 1,
    REJECT: 2,
    NOT_APPLIED: 3
};

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
    let voteDuration = 7;
    let voteName = "Vote Test";
    let initTime;

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
            // await setup.balancer.pool.transfer(accounts[1], stakeAmount);
            await setup.balancer.pool.approve(setup.votingMachine.address, halfStake, {from: accounts[1]});
            await expectRevert(setup.votingMachine.stake(stakeAmount, {from: accounts[1]}), "ERR_PCTOKEN_BAD_CALLER");
        });
        it('can stake token', async () => {
            // await setup.balancer.pool.transfer(accounts[1], stakeAmount);
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
    context('# withdraw lp token', async () => {
        it('amount should be > 0', async () => {
            await expectRevert(setup.votingMachine.withdraw(0), "VotingMachine: Cannot withdraw 0");
        });
        it('try withdraw without stake', async () => {
            await expectRevert(setup.votingMachine.withdraw(stakeAmount), "SafeMath: subtraction overflow");
        });
        it('can stake and withdraw', async () => {
            let tx = await setup.votingMachine.withdraw(stakeAmount, {from: accounts[1]})
            setup.data.tx = tx;

            await expectEvent.inTransaction(setup.data.tx.tx, setup.votingMachine, 'Withdrawn', {
                user: accounts[1],
                amount: stakeAmount
            });
            expect((await setup.votingMachine.balanceOf(accounts[1])).toString()).to.equal("0");
        });
    });
    context('# start a vote', async () => {
        it('need stake to start a vote ', async () => {
            await expectRevert(setup.votingMachine.startVoting(voteDuration, voteName, {from: accounts[1]}), "VotingMachine: vote creator should have stake");
        });
        it('stake and start a vote ', async () => {
            await setup.balancer.pool.approve(setup.votingMachine.address, stakeAmount, {from: accounts[1]});
            await setup.votingMachine.stake(stakeAmount, {from: accounts[1]})

            initTime = await time.latest();
            let tx = await setup.votingMachine.startVoting(voteDuration, voteName, {from: accounts[1]})
            setup.data.tx = tx;

            await expectEvent.inTransaction(setup.data.tx.tx, setup.votingMachine, 'VoteStarted', {
                votingId: '0'
            });
            let vote = await setup.votingMachine.getVote(0)

            expect(vote.createdAt.toNumber()).to.equal(initTime.toNumber());
            expect(vote.duration.toNumber()).to.equal(time.duration.days(voteDuration).toNumber());
            expect(vote.description).to.equal(voteName);
            expect(vote.executed).to.equal(false);
            expect(vote.totalAccepted.toString()).to.equal("0");
            expect(vote.totalRejected.toString()).to.equal("0");
        });
    });
    context('# vote', async () => {
        it('vote need to be created to vote ', async () => {
            await expectRevert(setup.votingMachine.vote(10, VoteStatus.ACCEPT, {from: accounts[1]}), "VotingMachine: Vote does not exist");
        });
        it('vote need to be accept or rejected ', async () => {
            await expectRevert(setup.votingMachine.vote(0, VoteStatus.NONE, {from: accounts[1]}), "VotingMachine: Invalid vote");
        });
        it('can vote ', async () => {
            let tx = await setup.votingMachine.vote(0, VoteStatus.ACCEPT, {from: accounts[1]});
            setup.data.tx = tx;

            await expectEvent.inTransaction(setup.data.tx.tx, setup.votingMachine, 'VotePlaced', {
                votingId: '0',
                voter: accounts[1],
                status: VoteStatus.ACCEPT.toString(),
                voteWeight: stakeAmount.toString()
            });

            let vote = await setup.votingMachine.getVote(0)
            expect(vote.totalAccepted.toString()).to.equal(stakeAmount.toString());
            expect(vote.totalRejected.toString()).to.equal("0");
        });
        it('can t vote twice ', async () => {
            await expectRevert(setup.votingMachine.vote(0, VoteStatus.REJECT, {from: accounts[1]}), "VotingMachine: The voter already voted");
        });
        it('can t vote when expired ', async () => {
            await time.increase(time.duration.days(voteDuration));
            await expectRevert(setup.votingMachine.vote(0, VoteStatus.ACCEPT, {from: accounts[1]}), "VotingMachine: Too late to vote");
        });
    });
    context('# execute vote', async () => {
        before('!! deploy setup', async () => {
            setup = await deploy(accounts);
            await setup.balancer.pool.transfer(accounts[1], stakeAmount);
            await setup.balancer.pool.approve(setup.votingMachine.address, stakeAmount, {from: accounts[1]});
            await setup.votingMachine.stake(stakeAmount, {from: accounts[1]})

            await setup.balancer.pool.transfer(accounts[2], halfStake);
            await setup.balancer.pool.approve(setup.votingMachine.address, halfStake, {from: accounts[2]});
            await setup.votingMachine.stake(halfStake, {from: accounts[2]})

            await setup.votingMachine.startVoting(voteDuration, voteName, {from: accounts[1]})
            await setup.votingMachine.vote(0, VoteStatus.ACCEPT, {from: accounts[1]});
            await setup.votingMachine.vote(0, VoteStatus.REJECT, {from: accounts[2]});
        });
        it('vote need to be created to execute ', async () => {
            await expectRevert(setup.votingMachine.executeVoting(10, {from: accounts[1]}), "VotingMachine: The voting does not exist");
        });
        it('vote need to be expired to execute ', async () => {
            await expectRevert(setup.votingMachine.executeVoting(0, {from: accounts[1]}), "VotingMachine: To early to execute");
        });
        it('execute vote with result ACCEPT ', async () => {
            await time.increase(time.duration.days(voteDuration + 1));
            let tx = await setup.votingMachine.executeVoting(0, {from: accounts[1]});
            setup.data.tx = tx;

            await expectEvent.inTransaction(setup.data.tx.tx, setup.votingMachine, 'VotingExecuted', {
                votingId: '0',
                result: VotingResult.ACCEPT.toString(),
            });

            let vote = await setup.votingMachine.getVote(0)
            expect(vote.totalAccepted.toString()).to.equal(stakeAmount.toString());
            expect(vote.totalRejected.toString()).to.equal(halfStake.toString());
            expect(vote.executed).to.equal(true);
            expect(vote.totalSupply.toString()).to.equal(setup.initialSupply.toString());
        });
        it('vote cant be execute twice ', async () => {
            await expectRevert(setup.votingMachine.executeVoting(0, {from: accounts[1]}), "VotingMachine: The voting was already executed");
        });
        context('# execute vote with REJECTED result', async () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                await setup.balancer.pool.transfer(accounts[1], stakeAmount);
                await setup.balancer.pool.approve(setup.votingMachine.address, stakeAmount, {from: accounts[1]});
                await setup.votingMachine.stake(stakeAmount, {from: accounts[1]})

                await setup.balancer.pool.transfer(accounts[2], halfStake);
                await setup.balancer.pool.approve(setup.votingMachine.address, halfStake, {from: accounts[2]});
                await setup.votingMachine.stake(halfStake, {from: accounts[2]})

                await setup.votingMachine.startVoting(voteDuration, voteName, {from: accounts[1]})
                await setup.votingMachine.vote(0, VoteStatus.REJECT, {from: accounts[1]});
                await setup.votingMachine.vote(0, VoteStatus.ACCEPT, {from: accounts[2]});
            });
            it('execute vote with result REJECTED ', async () => {
                await time.increase(time.duration.days(voteDuration + 1));
                let tx = await setup.votingMachine.executeVoting(0, {from: accounts[1]});
                setup.data.tx = tx;

                await expectEvent.inTransaction(setup.data.tx.tx, setup.votingMachine, 'VotingExecuted', {
                    votingId: '0',
                    result: VotingResult.REJECT.toString(),
                });
            });
        });
        context('# execute vote with REJECTED result', async () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                await setup.balancer.pool.transfer(accounts[2], halfStake);
                await setup.balancer.pool.approve(setup.votingMachine.address, halfStake, {from: accounts[2]});
                await setup.votingMachine.stake(halfStake, {from: accounts[2]})

                await setup.votingMachine.startVoting(voteDuration, voteName, {from: accounts[2]})
                await setup.votingMachine.vote(0, VoteStatus.ACCEPT, {from: accounts[2]});
            });
            it('execute vote with result NOT APPLIED ', async () => {
                await time.increase(time.duration.days(voteDuration + 1));
                let tx = await setup.votingMachine.executeVoting(0, {from: accounts[1]});
                setup.data.tx = tx;

                await expectEvent.inTransaction(setup.data.tx.tx, setup.votingMachine, 'VotingExecuted', {
                    votingId: '0',
                    result: VotingResult.NOT_APPLIED.toString(),
                });
            });
        });
    });
});