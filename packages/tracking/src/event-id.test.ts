import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newEventId, hashPii, normalizePhoneE164 } from './event-id.js';

test('event_id : deux événements identiques ne collisionnent jamais', () => {
  // La régression que ce test verrouille : un format déterministe
  // (marché + orderId + event) dédupliquerait deux AddToCart légitimes
  // du même produit en un seul.
  const a = newEventId('bj', 'AddToCart');
  const b = newEventId('bj', 'AddToCart');
  assert.notEqual(a, b);
});

test("event_id : le préfixe reste lisible pour l'event log", () => {
  assert.match(newEventId('bj', 'ViewContent'), /^vel_bj_viewcontent_/);
});

test('hashPii : normalise avant de hacher', () => {
  // Même personne saisie différemment → même hash, sinon le matching
  // publicitaire se dégrade sans que rien ne le signale.
  assert.equal(hashPii('  KOFI  '), hashPii('kofi'));
  assert.equal(hashPii('Cotonou'), hashPii('cotonou'));
});

test('hashPii : les accents sont retirés', () => {
  assert.equal(hashPii('Zoé'), hashPii('zoe'));
  assert.equal(hashPii('Bénin'), hashPii('benin'));
});

test('hashPii : produit bien un SHA256 hexadécimal', () => {
  assert.match(hashPii('kofi'), /^[0-9a-f]{64}$/);
});

test('E.164 : le même numéro béninois donne la même identité, quel que soit le format saisi', () => {
  // Le bug historique : le zéro initial était retiré comme un préfixe
  // interurbain, ce qui scindait un client en deux identités et laissait
  // un numéro banni repasser en format local.
  const international = normalizePhoneE164('+229 01 97 12 34 56', '229');
  const local = normalizePhoneE164('01 97 12 34 56', '229');
  assert.equal(local, international);
  assert.equal(international, '2290197123456');
});

test('E.164 : le zéro initial est conservé (BJ et CI ne sont pas des trunk prefixes)', () => {
  assert.equal(normalizePhoneE164('01 97 12 34 56', '229'), '2290197123456');
  assert.equal(normalizePhoneE164('07 00 11 22 33', '225'), '2250700112233');
});

test('E.164 : la ponctuation de saisie est ignorée', () => {
  assert.equal(normalizePhoneE164('+229-01.97 12/34/56', '229'), '2290197123456');
});
