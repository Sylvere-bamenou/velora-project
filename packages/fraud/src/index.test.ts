import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess, SIGNAL_WEIGHTS, DEFAULT_THRESHOLDS } from './index.js';

const vpn = { code: 'ip_vpn', points: SIGNAL_WEIGHTS.ip_vpn, detail: 'VPN détecté' };
const voip = { code: 'phone_voip', points: SIGNAL_WEIGHTS.phone_voip, detail: 'Numéro VoIP' };

test('shadow mode : un score de blocage ne bloque pas', () => {
  // L'invariant central. Si ce test tombe, des clients légitimes derrière
  // un CGNAT ouest-africain sont bannis en production sans qu'on le voie.
  const r = assess([vpn, voip]);
  assert.ok(r.score >= DEFAULT_THRESHOLDS.block);
  assert.equal(r.decision, 'blacklist');
  assert.equal(r.applied, 'accept');
  assert.equal(r.enforcement, 'shadow');
});

test('shadow mode est le défaut — il faut le demander explicitement pour bloquer', () => {
  assert.equal(assess([]).enforcement, 'shadow');
});

test('enforcement actif : la décision est appliquée', () => {
  const r = assess([vpn, voip], { enforcement: 'active' });
  assert.equal(r.applied, r.decision);
});

test('le score reste borné à 100 même en cumulant les signaux', () => {
  // Tor seul vaut déjà 100 : sans borne, le cumul produirait des scores
  // hors échelle et les seuils perdraient leur sens.
  const r = assess([
    { code: 'ip_tor', points: SIGNAL_WEIGHTS.ip_tor, detail: 'Tor' },
    voip,
    vpn,
  ]);
  assert.equal(r.score, 100);
});

test('aucun signal : score nul, commande acceptée', () => {
  const r = assess([]);
  assert.equal(r.score, 0);
  assert.equal(r.decision, 'accept');
});

test('les seuils découpent les quatre décisions', () => {
  const at = (points: number) => assess([{ code: 'x', points, detail: '' }]).decision;
  assert.equal(at(29), 'accept');
  assert.equal(at(30), 'review');
  assert.equal(at(69), 'review');
  assert.equal(at(70), 'block');
  assert.equal(at(84), 'block');
  assert.equal(at(85), 'blacklist');
});
