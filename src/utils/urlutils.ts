export const jsonToFormData = (obj: any) => {
	const params = new URLSearchParams();
	for (let key in obj) {
		params.append(key, obj[key]);
	}
	return params;
};
