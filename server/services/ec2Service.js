/**
 * EC2 Service
 * Handles AWS EC2 instance operations with user-scoped isolation
 */

'use strict';

const config = require('../config/environment');
const {
    ec2Client,
    RunInstancesCommand,
    DescribeInstancesCommand,
    TerminateInstancesCommand,
    DescribeInstanceStatusCommand
} = require('./awsService');

/**
 * Launch a new EC2 instance tagged with the requesting user's ID.
 * Uses t2.micro for Free Tier safety.
 *
 * @param {string} userId - Owner's user ID (used for resource-isolation tag)
 * @param {string} instanceName - Human-readable name for the instance
 * @returns {object} Launched instance details
 */
const launchInstance = async (userId, instanceName) => {
    if (config.DEV_MODE) {
        console.log(`DEV_MODE: Simulating EC2 launch for user ${userId}`);
        return {
            InstanceId: `i-dev-${Date.now()}`,
            InstanceType: 't2.micro',
            State: { Name: 'pending' },
            Tags: [
                { Key: 'Name', Value: instanceName },
                { Key: 'UserId', Value: userId }
            ],
            LaunchTime: new Date().toISOString()
        };
    }

    const command = new RunInstancesCommand({
        ImageId: config.EC2_DEFAULT_AMI,
        InstanceType: 't2.micro',
        MinCount: 1,
        MaxCount: 1,
        TagSpecifications: [
            {
                ResourceType: 'instance',
                Tags: [
                    { Key: 'Name', Value: instanceName },
                    { Key: 'UserId', Value: userId },
                    { Key: 'ManagedBy', Value: 'Vaultify' }
                ]
            }
        ]
    });

    const response = await ec2Client.send(command);
    const instance = response.Instances[0];

    console.log(`✅ EC2 instance ${instance.InstanceId} launched for user ${userId}`);
    return {
        InstanceId: instance.InstanceId,
        InstanceType: instance.InstanceType,
        State: instance.State,
        Tags: instance.Tags,
        LaunchTime: instance.LaunchTime
    };
};

/**
 * List EC2 instances belonging to a specific user.
 *
 * @param {string} userId - Owner's user ID
 * @returns {Array} Instances owned by the user
 */
const listInstances = async (userId) => {
    if (config.DEV_MODE) {
        console.log(`DEV_MODE: Returning mock instances for user ${userId}`);
        return [
            {
                InstanceId: 'i-dev-001',
                InstanceType: 't2.micro',
                State: { Name: 'running' },
                Tags: [
                    { Key: 'Name', Value: 'Dev Server' },
                    { Key: 'UserId', Value: userId }
                ],
                LaunchTime: new Date(Date.now() - 86400000).toISOString(),
                PublicIpAddress: '203.0.113.10',
                PrivateIpAddress: '10.0.1.42'
            },
            {
                InstanceId: 'i-dev-002',
                InstanceType: 't2.micro',
                State: { Name: 'stopped' },
                Tags: [
                    { Key: 'Name', Value: 'Test Runner' },
                    { Key: 'UserId', Value: userId }
                ],
                LaunchTime: new Date(Date.now() - 172800000).toISOString(),
                PublicIpAddress: null,
                PrivateIpAddress: '10.0.1.55'
            }
        ];
    }

    const command = new DescribeInstancesCommand({
        Filters: [
            { Name: 'tag:UserId', Values: [userId] },
            { Name: 'tag:ManagedBy', Values: ['Vaultify'] },
            {
                Name: 'instance-state-name',
                Values: ['pending', 'running', 'stopping', 'stopped']
            }
        ]
    });

    const response = await ec2Client.send(command);

    const instances = [];
    for (const reservation of response.Reservations || []) {
        for (const inst of reservation.Instances || []) {
            instances.push({
                InstanceId: inst.InstanceId,
                InstanceType: inst.InstanceType,
                State: inst.State,
                Tags: inst.Tags,
                LaunchTime: inst.LaunchTime,
                PublicIpAddress: inst.PublicIpAddress || null,
                PrivateIpAddress: inst.PrivateIpAddress || null
            });
        }
    }

    return instances;
};

/**
 * Terminate an EC2 instance after verifying it belongs to the requesting user.
 *
 * @param {string} userId - Requesting user's ID
 * @param {string} instanceId - EC2 instance ID to terminate
 * @returns {object} Termination result
 */
const terminateInstance = async (userId, instanceId) => {
    if (config.DEV_MODE) {
        console.log(`DEV_MODE: Simulating termination of ${instanceId} for user ${userId}`);
        return {
            InstanceId: instanceId,
            PreviousState: { Name: 'running' },
            CurrentState: { Name: 'shutting-down' }
        };
    }

    // Step 1: Verify the instance belongs to this user
    const describeCommand = new DescribeInstancesCommand({
        InstanceIds: [instanceId],
        Filters: [
            { Name: 'tag:UserId', Values: [userId] },
            { Name: 'tag:ManagedBy', Values: ['Vaultify'] }
        ]
    });

    const describeResponse = await ec2Client.send(describeCommand);
    const reservations = describeResponse.Reservations || [];

    if (reservations.length === 0 || reservations[0].Instances.length === 0) {
        const error = new Error('Instance not found or does not belong to this user');
        error.statusCode = 403;
        throw error;
    }

    // Step 2: Terminate the verified instance
    const terminateCommand = new TerminateInstancesCommand({
        InstanceIds: [instanceId]
    });

    const terminateResponse = await ec2Client.send(terminateCommand);
    const change = terminateResponse.TerminatingInstances[0];

    console.log(`✅ EC2 instance ${instanceId} terminated by user ${userId}`);
    return {
        InstanceId: change.InstanceId,
        PreviousState: change.PreviousState,
        CurrentState: change.CurrentState
    };
};

module.exports = {
    launchInstance,
    listInstances,
    terminateInstance
};
