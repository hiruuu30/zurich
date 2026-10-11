/** Preserve original textures while calibrating known PBR finishes. */
const profiles={"default material":[0,0.75],"Wood 58":[0,0.65],"Wood 17_1":[0,0.57],"Wood 32, Laminated":[0,0.4],"black":[0,0.43],"e5e4e12":[0,0.56],"b4b4b253":[0,0.57],"Translucent_Glass_Blue":[0,0.09],"2e2e2e":[0,0.47],"Marble 05":[0,0.27],"Marble 06":[0,0.26],"Color D01":[0,0.5],"Material2":[0,0.53],"den sang 1":[0,0.32],"Material~5":[0,0.6],"Aluminum":[0.83,0.33],"Color D05":[0,0.6],"Brick 12":[0,0.88],"Material1":[0,0.48],"CCCHROME1":[0.91,0.15],"steel_brushed_FJ":[0.85,0.32],"Steel Brushed Stainless":[0.8,0.32],"Material~6":[0,0.65],"nhua trang":[0,0.39],"#Plastic_Simple_Shiny_White_AIRCON":[0,0.26],"PDM_Sony_KDL-42W705B_plastic_black":[0,0.33],"PDM_Sony_KDL-42W705B_chrome":[0.85,0.2],"PDM_Sony_KDL-42W705B_lamp_blue":[0,0.34],"PDM_Sony_KDL-42W705B_Bravia_logo":[0,0.57],"PDM_Sony_KDL-42W705B_Sony_logo":[0,0.48],"0135_DarkGray":[0,0.5],"pis200t":[0,0.39],"Iron 01, Stainless":[0.79,0.36]};
// Base color factors are linear RGB multipliers. Existing base-color texture maps remain intact.
// Sofa upholstery is one shared material on both sofas in the current DR NEIL GLB.
const colorOverrides = Object.freeze({
  fur: [0.36625, 0.30947, 0.25818, 1], // Warm greige (#A3978B) carpet
  Material__0_0_1: [0.78, 0.79, 0.80, 1], // Cooler, soft grey sofa upholstery
});
export function tunePbrMaterials(model){
  if(!model?.materials)return;
  for(const m of model.materials){
    const pbr=m.pbrMetallicRoughness;
    if(!pbr)continue;
    const p=profiles[m.name];
    if(p){pbr.setMetallicFactor(p[0]);pbr.setRoughnessFactor(p[1]);}
    const color=colorOverrides[m.name];
    if(color){
      pbr.setBaseColorFactor([...color]);
      pbr.setMetallicFactor(0);
      pbr.setRoughnessFactor(m.name==='fur'?0.97:0.9);
    }
  }
}
