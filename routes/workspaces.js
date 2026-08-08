// ============================================
// VYNK — Enterprise Workspaces, RBAC & Leads Routes
// ============================================
const express = require('express');
const router = express.Router();
const { dbReady } = require('../database/db');
const auth = require('../middleware/auth');

// GET /api/workspaces — Listar espacios de trabajo del usuario
router.get('/', auth, async (req, res) => {
  try {
    const db = await dbReady;
    let workspaces = db.prepare('SELECT * FROM workspaces WHERE owner_id = ? ORDER BY id ASC').all(req.user.id);

    // Si el usuario aún no tiene un workspace personal, crearlo automáticamente
    if (!workspaces || workspaces.length === 0) {
      const ins = db.prepare("INSERT INTO workspaces (nombre, owner_id, tipo) VALUES (?, ?, 'personal')").run(`Personal Workspace (${req.user.nombre})`, req.user.id);
      workspaces = db.prepare('SELECT * FROM workspaces WHERE owner_id = ? ORDER BY id ASC').all(req.user.id);
    }

    res.json({ success: true, workspaces });
  } catch (err) {
    console.error('Error listando workspaces:', err);
    res.status(500).json({ error: 'Error al obtener espacios de trabajo' });
  }
});

// POST /api/workspaces — Crear un nuevo Company Workspace B2B
router.post('/', auth, async (req, res) => {
  try {
    const { nombre, tipo } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del Workspace es obligatorio' });
    }

    const db = await dbReady;
    const result = db.prepare("INSERT INTO workspaces (nombre, owner_id, tipo) VALUES (?, ?, ?)").run(nombre.trim(), req.user.id, tipo || 'company');
    
    // Agregar al creador como Admin del Workspace en workspace_members
    db.prepare("INSERT INTO workspace_members (workspace_id, usuario_id, role) VALUES (?, ?, 'Admin')").run(result.lastInsertRowid, req.user.id);

    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, workspace });
  } catch (err) {
    console.error('Error creando workspace:', err);
    res.status(500).json({ error: 'Error al crear espacio de trabajo' });
  }
});

// GET /api/workspaces/:id/members — Listar miembros del equipo (RBAC)
router.get('/:id/members', auth, async (req, res) => {
  try {
    const db = await dbReady;
    const workspaceId = parseInt(req.params.id, 10);
    const members = db.prepare(`
      SELECT wm.id, wm.workspace_id, wm.usuario_id, wm.role, u.nombre, u.email, u.telefono
      FROM workspace_members wm
      JOIN usuarios u ON u.id = wm.usuario_id
      WHERE wm.workspace_id = ?
    `).all(workspaceId);

    res.json({ success: true, members });
  } catch (err) {
    console.error('Error listando miembros de equipo:', err);
    res.status(500).json({ error: 'Error al obtener miembros del equipo' });
  }
});

// POST /api/workspaces/:id/members — Invitar/Asignar miembro con rol (RBAC: Admin, Editor, Viewer)
router.post('/:id/members', auth, async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id, 10);
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Correo electrónico obligatorio para invitar miembro' });
    }

    const db = await dbReady;
    const targetUser = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email.trim());
    if (!targetUser) {
      return res.status(444 || 404).json({ error: 'Usuario no encontrado con ese correo' });
    }

    const validRole = ['Admin', 'Editor', 'Viewer'].includes(role) ? role : 'Editor';
    db.prepare("INSERT INTO workspace_members (workspace_id, usuario_id, role) VALUES (?, ?, ?)").run(workspaceId, targetUser.id, validRole);

    res.status(201).json({ success: true, mensaje: `Usuario invitado con rol ${validRole}` });
  } catch (err) {
    console.error('Error invitando miembro:', err);
    res.status(500).json({ error: 'Error al asignar miembro en el workspace' });
  }
});

// POST /api/leads — Captura de Leads (Formulario de Contacto e Integración Webhook CRM)
router.post('/leads', async (req, res) => {
  try {
    const { perfil_id, nombre, email, telefono, mensaje } = req.body;
    if (!perfil_id || !nombre || !email) {
      return res.status(400).json({ error: 'Nombre y Email son obligatorios' });
    }

    const db = await dbReady;
    const result = db.prepare(`
      INSERT INTO lead_captures (perfil_id, nombre, email, telefono, mensaje, webhook_status)
      VALUES (?, ?, ?, ?, ?, 'ready_for_crm')
    `).run(perfil_id, nombre.trim(), email.trim(), telefono || null, mensaje || null);

    res.status(201).json({ success: true, lead_id: result.lastInsertRowid, mensaje: 'Lead capturado con éxito y listo para sincronización CRM' });
  } catch (err) {
    console.error('Error capturando lead:', err);
    res.status(500).json({ error: 'Error al registrar prospecto' });
  }
});

module.exports = router;
