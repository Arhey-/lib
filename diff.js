export function eqSet(set1, set2) {
	const s1=new Set(set1),s2=new Set(set2)
	if(s1.size!=s2.size) return false;
	for(const v of s1){
		if(!s2.has(v))return false
	}
	return true
}
