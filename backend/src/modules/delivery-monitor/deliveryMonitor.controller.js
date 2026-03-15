import * as svc from './deliveryMonitor.service.js';

export async function listGroups(req, res, next) {
  try {
    res.json(await svc.listGroups());
  } catch (e) { next(e); }
}

export async function createGroup(req, res, next) {
  try {
    const { groupJid, name, agentId } = req.body;
    if (!groupJid || !name) return res.status(400).json({ error: 'groupJid and name required' });
    res.status(201).json(await svc.createGroup({ groupJid, name, agentId }));
  } catch (e) { next(e); }
}

export async function updateGroup(req, res, next) {
  try {
    res.json(await svc.updateGroup(req.params.id, req.body));
  } catch (e) { next(e); }
}

export async function listLogs(req, res, next) {
  try {
    const { groupJid, type, page, limit } = req.query;
    res.json(await svc.listLogs({
      groupJid,
      type,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    }));
  } catch (e) { next(e); }
}

export async function listDeliveries(req, res, next) {
  try {
    const { agentName, remitted, page, limit } = req.query;
    res.json(await svc.listDeliveries({
      agentName,
      remitted: remitted === 'true' ? true : remitted === 'false' ? false : undefined,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    }));
  } catch (e) { next(e); }
}

export async function listRemittances(req, res, next) {
  try {
    const { agentName, page, limit } = req.query;
    res.json(await svc.listRemittances({
      agentName,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    }));
  } catch (e) { next(e); }
}

export async function listStock(req, res, next) {
  try {
    const { groupJid, page, limit } = req.query;
    res.json(await svc.listStock({
      groupJid,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    }));
  } catch (e) { next(e); }
}

export async function listFollowUps(req, res, next) {
  try {
    const { resolved, page, limit } = req.query;
    res.json(await svc.listFollowUps({
      resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    }));
  } catch (e) { next(e); }
}

export async function resolveFollowUp(req, res, next) {
  try {
    res.json(await svc.resolveFollowUp(req.params.id));
  } catch (e) { next(e); }
}

export async function getAgentReport(req, res, next) {
  try {
    res.json(await svc.getAgentReport(req.params.agentName));
  } catch (e) { next(e); }
}
