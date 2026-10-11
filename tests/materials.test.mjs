import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tunePbrMaterials } from '../src/materials.js';

const material = (name) => {
  const values = {};
  const pbrMetallicRoughness = {
    setBaseColorFactor(value) { values.baseColor = value; },
    setMetallicFactor(value) { values.metallic = value; },
    setRoughnessFactor(value) { values.roughness = value; },
  };
  return { name, pbrMetallicRoughness, values };
};

test('carpet recolors to warm greige and sofas to cooler grey while keeping other colors', () => {
  const carpet = material('fur');
  const sofas = material('Material__0_0_1');
  const wood = material('Wood 17_1');
  const unknown = material('other');
  tunePbrMaterials({materials: [carpet, sofas, wood, unknown]});
  assert.deepEqual(carpet.values.baseColor, [0.36625, 0.30947, 0.25818, 1]);
  assert.deepEqual(sofas.values.baseColor, [0.78, 0.79, 0.80, 1]);
  assert.equal(carpet.values.roughness, 0.97);
  assert.equal(sofas.values.roughness, 0.9);
  assert.equal(wood.values.roughness, 0.57);
  assert.equal(wood.values.baseColor, undefined);
  assert.deepEqual(unknown.values, {});
});

test('current DR NEIL GLB contains the expected carpet and sofa materials', () => {
  const glb = readFileSync(new URL('../public/models/dr-neil.glb', import.meta.url));
  assert.equal(glb.toString('ascii', 0, 4), 'glTF');
  const length = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.toString('utf8', 20, 20+length));
  const names = gltf.materials.map(m=>m.name);
  assert(names.includes('fur'));
  assert(names.includes('Material__0_0_1'));
});
