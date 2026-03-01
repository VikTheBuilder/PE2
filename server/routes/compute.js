/**
 * Compute Routes
 * API endpoints for EC2 instance management
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { launchInstance, listInstances, terminateInstance } = require('../services/ec2Service');

/**
 * GET /api/compute
 * List all EC2 instances belonging to the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const instances = await listInstances(req.user.id);
        res.json({ instances });
    } catch (error) {
        console.error('❌ Error listing instances:', error);
        res.status(500).json({ error: 'Failed to list instances' });
    }
});

/**
 * POST /api/compute/launch
 * Launch a new EC2 instance for the authenticated user
 * Body: { instanceName: string }
 */
router.post('/launch', authenticateToken, async (req, res) => {
    try {
        const { instanceName } = req.body;

        if (!instanceName || typeof instanceName !== 'string' || instanceName.trim().length === 0) {
            return res.status(400).json({ error: 'instanceName is required' });
        }

        const sanitizedName = instanceName.trim().substring(0, 64);
        const instance = await launchInstance(req.user.id, sanitizedName);

        res.status(201).json({
            message: `Instance "${sanitizedName}" launched successfully`,
            instance
        });
    } catch (error) {
        console.error('❌ Error launching instance:', error);
        res.status(500).json({ error: 'Failed to launch instance' });
    }
});

/**
 * DELETE /api/compute/:instanceId
 * Terminate an EC2 instance owned by the authenticated user
 */
router.delete('/:instanceId', authenticateToken, async (req, res) => {
    try {
        const { instanceId } = req.params;

        if (!instanceId || !instanceId.startsWith('i-')) {
            return res.status(400).json({ error: 'Invalid instance ID format' });
        }

        const result = await terminateInstance(req.user.id, instanceId);

        res.json({
            message: `Instance ${instanceId} termination initiated`,
            result
        });
    } catch (error) {
        console.error('❌ Error terminating instance:', error);

        if (error.statusCode === 403) {
            return res.status(403).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to terminate instance' });
    }
});

module.exports = router;
