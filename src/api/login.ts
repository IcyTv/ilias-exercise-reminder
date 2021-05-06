import cheerio from "cheerio";
import got, { OptionsOfTextResponseBody } from "got";
import { CookieJar } from "tough-cookie";
import { jsonToFormData } from "../utils/urlutils";

const userAgent =
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36";

const defaultOpts: {
	resource: string;
	token?: string;
	cookieJar: CookieJar; //The reason for doing this is, that it can extend the cookiejar for urls and stuff like that
	query: string;
} = {
	resource: "https://ilias.studium.kit.edu",
	cookieJar: new CookieJar(),
	token: undefined,
	query: "",
};

export const login = async (
	user: string,
	password: string,
	opts: Partial<typeof defaultOpts> = defaultOpts
) => {
	const fullOpts = {
		...defaultOpts,
		...opts,
	};

	const gotConfig: OptionsOfTextResponseBody = {
		methodRewriting: false,
		https: {
			rejectUnauthorized: false,
		},
		headers: {
			"User-Agent": userAgent,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		cookieJar: fullOpts.cookieJar,
	};

	const postData = jsonToFormData({
		sendLogin: 1,
		idp_selection: "https://idp.scc.kit.edu/idp/shibboleth",
		target: "/shib_login.php?target=",
		home_organization_selection: "Mit KIT-Account anmelden",
	}).toString();

	const sessionEstablishment = await got(
		fullOpts.resource + "/Shibboleth.sso/Login" + fullOpts.query,
		{
			...gotConfig,
			method: "POST",
			body: postData,
		}
	);

	const $ = cheerio.load(sessionEstablishment.body);
	const csrfToken = ($('input[name="csrf_token"]').attr() || {})["value"];

	if (!csrfToken) {
		console.log(
			"Webpage start\n====\n\n",
			$("body").html(),
			"\nWebpage End\n====\n\n"
		);
		throw new Error("Could not find csrf token!");
	}

	const loginData = jsonToFormData({
		j_username: user,
		j_password: password,
		_eventId_proceed: "",
		csrf_token: csrfToken,
	}).toString();

	let loginResponse = await got(sessionEstablishment.url, {
		...gotConfig,
		method: "POST",
		body: loginData,
	});

	if (fullOpts.token) {
		const tokenPage = cheerio.load(loginResponse.body);

		const csrfToken = (tokenPage('input[name="csrf_token"]').attr() || {})[
			"value"
		];

		if (!csrfToken) {
			console.log(
				"Webpage start\n====\n\n",
				$("body").html(),
				"\nWebpage End\n====\n\n"
			);
			throw new Error("Could not find csrf token!");
		}

		const tokenData = jsonToFormData({
			j_tokenNumber: fullOpts.token,
			csrf_token: csrfToken,
			_eventId_proceed: "",
		}).toString();

		loginResponse = await got(loginResponse.url, {
			...gotConfig,
			method: "POST",
			body: tokenData,
		});
	}

	const $2 = cheerio.load(loginResponse.body);

	let tokenNeeded = false;

	if (
		$2("h3.waypoint-triggered") &&
		$2("h3.waypoint-triggered").text() === "Token-basierter Login"
	) {
		tokenNeeded = true;
	}

	const saml = $2('input[name="SAMLResponse"]');
	const relayState = $2('input[name="RelayState"]');

	if (!saml || !(saml.attr() || {}).value) {
		if (tokenNeeded) {
			throw new Error("Likely token needed!");
		}
		console.log(
			"Webpage start\n====\n\n",
			$2("body").html(),
			"\nWebpage End\n====\n\n"
		);
		throw new Error("No saml response, incorrect username or password!");
	}

	if (!relayState || !(relayState.attr() || {}).value) {
		throw new Error("No relay state");
	}

	const samlData = jsonToFormData({
		SAMLResponse: saml.attr().value,
		RelayState: relayState.attr().value,
	}).toString();

	await got(fullOpts.resource + "/Shibboleth.sso/SAML2/POST", {
		...gotConfig,
		method: "POST",
		body: samlData,
	});
};

export const campusLogin = (
	username: string,
	password: string,
	opts: { token?: string; cookieJar?: CookieJar } = {}
) => {
	login(username, password, {
		resource: "https://campus.studium.kit.edu",
		token: "cccccctcjtjclifgcccrcljthrtllkkthrreegejdnlt",
		query: "?target=https%3A%2F%2Fcampus.studium.kit.edu%2F%3Flogin%3D1",
		...opts,
	});
};
