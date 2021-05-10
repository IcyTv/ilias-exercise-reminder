import { CookieJar } from "tough-cookie";
import got, { Response } from "got";
import cheerio from "cheerio";
import path from "path";
import chalk from "chalk";
import _ from "underscore";
import moment from "moment";
import "moment/locale/de";

moment.updateLocale("de", {
	monthsShort: [
		"Jan",
		"Feb",
		"Mär",
		"Apr",
		"Mai",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Okt",
		"Nov",
		"Dez",
	],
});

const keywords = ["Übungsblätter", "Übungen", "Aufgabenblätter"];

const url =
	"https://ilias.studium.kit.edu/ilias.php?baseClass=ilPersonalDesktopGUI&cmd=jumpToMemberships";

export const getCourses = async (cookieJar: CookieJar) => {
	const res = await got(url, {
		cookieJar,
	});
	const coursePage = cheerio.load(res.body);
	const courses = coursePage("div.ilContainerListItemOuter");
	const actualCourses: any[] = [];

	courses.each(function (this: ReturnType<typeof cheerio>) {
		const course = cheerio(this);
		const img = course.find("img.ilListItemIcon");
		if (
			img.attr("alt") === "Kurs" ||
			img.attr("title") === "Kurs" ||
			img.attr("title") === "Gruppe" ||
			img.attr("alt") === "Gruppe"
		) {
			actualCourses.push(this);
		}
	});

	const links: { name: string; url: string }[] = [];

	actualCourses.forEach((course) => {
		const $ = cheerio.load(course);
		const link = $("a.il_ContainerItemTitle");
		links.push({
			name: link.text(),
			url: link.attr("href")!,
		});
	});

	const exercises = await Promise.all(
		links.map(async (link) => {
			const exerciseResult = await getExercises(
				link.url,
				link.name,
				cookieJar
			);
			return {
				name: exerciseResult.newCourseName || link.name,
				exercises: exerciseResult.found,
			};
		})
	);

	return exercises.filter((course) => course.exercises.length > 0);
};

const getExercises = async (
	courseLink: string,
	courseName: string,
	cookieJar: CookieJar
) => {
	console.log(chalk.green("Checking"), chalk.yellow(courseLink));
	let res: Response<string>;
	try {
		res = await got(
			path.posix.join("https://ilias.studium.kit.edu", courseLink),
			{
				cookieJar,
			}
		);
	} catch (err) {
		console.warn(chalk.yellow(err));
		return { newCourseName: courseName, found: [] };
	}
	const $ = cheerio.load(res.body);
	let newCourseName = courseName;

	if (courseName.includes("Tutorium")) {
		newCourseName = $("ol.breadcrumb").find("li:nth-child(5) > a").text();
		// console.log("NewCourseName", newCourseName);
	}

	const listItems = $("div.ilContainerListItemOuter");

	const recheck: string[] = [];
	const found: { name: string; url: string }[] = [];

	listItems.each(function (this: ReturnType<typeof cheerio>) {
		const $ = cheerio.load(this);
		const img = $("img.ilListItemIcon");
		const a = $("a.il_ContainerItemTitle");
		// console.log(img.html(), a.text());
		if (img.attr("alt") === "Ordner" || img.attr("title") === "Ordner") {
			for (let keyword of keywords) {
				if (a.text() === keyword) {
					recheck.push(a.attr("href")!);
				}
			}
		} else if (
			img.attr("title") === "Übung" ||
			img.attr("alt") === "Übung"
		) {
			found.push({
				name: a.text(),
				url: a.attr("href")!,
			});
		}
	});

	for (let link of recheck) {
		found.push(
			...(
				await getExercises(
					path.posix.join("https://ilias.studium.kit.edu", link),
					newCourseName,
					cookieJar
				)
			).found
		);
	}

	return { found, newCourseName };
};

type Deadline = Partial<{
	startTime: Date;
	endTime: Date;
	name: string;
	url: string;
}>;

export const getExerciseDeadlines = async (
	courses: {
		name: string;
		exercises: { name: string; url: string }[];
	}[],
	cookieJar: CookieJar
) => {
	const proms = courses.map(async (course) => {
		console.log(chalk.green("Getting exercises for", course.name));
		const exerciseDeadlines: {
			mainName: string;
			deadlines: Deadline[];
		}[] = [];
		for (let exercise of course.exercises) {
			const deadlines: Deadline[] = [];
			const url = path.posix.join(
				"https://ilias.studium.kit.edu",
				exercise.url
			);
			const res = await got(url, { cookieJar });
			const $ = cheerio.load(res.body);
			const asingemnts = $("div.il_VAccordionInnerContainer");
			asingemnts.each(function (this: ReturnType<typeof cheerio>) {
				const $ = cheerio.load(this);
				const infoSec = $("div.ilInfoScreenSec");
				const name = $("span.ilAssignmentHeader").text();
				const deadline: Deadline = {
					name,
					url,
				};
				let stopped = false;
				infoSec.each(function (this: ReturnType<typeof cheerio>) {
					if (stopped) return;
					const $ = cheerio.load(this);
					const header = $("h3.ilHeader");
					if (!header.text().includes("Termin")) return;

					const children = $(".form-group");

					children.each(function (this: ReturnType<typeof cheerio>) {
						if (stopped) return;
						const child = cheerio.load(this);
						const property = child("div.il_InfoScreenProperty");
						const value = child("div.il_InfoScreenPropertyValue ");
						if (
							property.text().includes("Beendet") ||
							value.text().toLowerCase().includes("beendet") ||
							value.text().toLowerCase().includes("abgelaufen")
						) {
							stopped = true;
						}
						if (property.text().includes("Start")) {
							deadline.startTime = new Date(value.text()?.trim());
						} else if (
							(property.text().includes("Abgabe") ||
								property.text().includes("Bearbeitung")) &&
							!deadline.endTime
						) {
							console.log(chalk.blueBright("Got End date"));
							if (value.text().includes("Heute")) {
								console.log(chalk.greenBright("Heute"));
								deadline.endTime = new Date();
							} else {
								try {
									const date = moment(
										value.text()!.trim().split(",")[0],
										"DD MMMM YYYY",
										"de"
									);
									console.log(
										chalk.yellow(date.toISOString())
									);
									if (!date.isValid()) {
										console.warn(
											chalk.yellow(
												"Invalid date",
												value
													.text()!
													.trim()
													.split(",")[0],
												date
											)
										);
									} else {
										deadline.endTime = date.toDate();
									}
									return;
								} catch (e) {
									console.warn(chalk.yellow(e));
								}
								// deadline.endTime = new Date(
								// 	value.text()?.trim()
								// );
							}
						} else {
							//console.warn(
							// 	chalk.yellow("Unknown property"),
							// 	chalk.red(property.text(), value.text()?.trim())
							// );
						}
					});
				});
				deadlines.push(deadline);
			});

			exerciseDeadlines.push({
				mainName: exercise.name,
				deadlines,
			});
		}
		return {
			course: course.name,
			exerciseDeadlines,
		};
	});

	const res = await Promise.all(proms);
	return res;
};
