import moment from "moment";
import "moment/locale/de";

const date = "14. Mai 2021, 13:00".split(",")[0];
const parsed = moment(date, "DD MMMM YYYY", "de");
console.log(parsed);
