export async function openCamera(constraints){
 if(!globalThis.isSecureContext)throw new Error('Камера үшін сайтты HTTPS сілтемесімен ашыңыз.');
 if(!navigator.mediaDevices?.getUserMedia)throw new Error('Браузер камераны қолдамайды. Chrome немесе Edge арқылы ашыңыз.');
 const policy=document.permissionsPolicy||document.featurePolicy;
 if(policy?.allowsFeature&&!policy.allowsFeature('camera'))throw new Error('Бұл кірістірілген бетте камераға рұқсат жоқ. Жоғарыдағы «Бөлек қойындыда ашу» сілтемесін басыңыз.');
 return navigator.mediaDevices.getUserMedia(constraints);
}
export function explainCameraError(error){
 if(error.name==='NotAllowedError')return 'Камераға рұқсат берілмеді. Мекенжай жанындағы баптаудан Камера → Рұқсат ету таңдаңыз. Қажет болса, сайтты бөлек қойындыда ашыңыз.';
 if(error.name==='NotFoundError')return 'Камера табылмады. Құрылғыны қосып, қайта басыңыз.';
 if(error.name==='NotReadableError')return 'Камераны басқа бағдарлама пайдаланып тұр немесе жүйелік рұқсат жоқ. Басқа камера қолданбаларын жауып көріңіз.';
 return 'Камера ашылмады: '+error.message;
}
