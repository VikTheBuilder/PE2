/**
 * Compute Routes
 * API endpoints for EC2 instance management
 */

'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    launchInstance, listInstances, terminateInstance,
    getInstanceHealth, getSystemEvents, addEvent
} = require('../services/ec2Service');

/**
 * GET /api/compute/health
 * Get real-time system health from AWS instance status checks
 */
router.get('/health', authenticateToken, async (req, res) => {
    try {
        const health = await getInstanceHealth(req.user.id);
        res.json(health);
    } catch (error) {
        console.error('❌ Health check error:', error);
        res.status(500).json({ error: 'Failed to get health data' });
    }
});

/**
 * GET /api/compute/logs
 * Get recent system events (launches, terminations, errors)
 */
router.get('/logs', authenticateToken, async (req, res) => {
    try {
        const events = getSystemEvents();
        res.json({ events });
    } catch (error) {
        console.error('❌ Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to get system logs' });
    }
});

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
            instance,
            sshInfo: {
                keyName: instance.KeyName || 'vaultify-ssh-key',
                user: 'ec2-user',
                note: 'Public IP will be available once the instance is running. Download the PEM key from GET /api/compute/key.'
            }
        });
    } catch (error) {
        console.error('❌ Error launching instance:', error);
        res.status(500).json({ error: 'Failed to launch instance' });
    }
});

/**
 * GET /api/compute/key
 * Download the Vaultify SSH private key (.pem)
 */
router.get('/key', authenticateToken, async (req, res) => {
    try {
        const pemPath = path.join(__dirname, '..', 'data', 'keys', 'vaultify-ssh-key.pem');

        if (!fs.existsSync(pemPath)) {
            return res.status(404).json({
                error: 'SSH key not found. Launch an instance first to auto-generate the key pair.'
            });
        }

        res.setHeader('Content-Disposition', 'attachment; filename=vaultify-ssh-key.pem');
        res.setHeader('Content-Type', 'application/x-pem-file');
        res.sendFile(pemPath);
    } catch (error) {
        console.error('❌ Error downloading key:', error);
        res.status(500).json({ error: 'Failed to download SSH key' });
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
