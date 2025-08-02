export interface MoodleConfig {
	baseUrl: string;
	token: string;
	service?: string;
}

// biome-ignore lint/suspicious/noExplicitAny: <any>
export interface MoodleResponse<T = any> {
	data?: T;
	exception?: string;
	errorcode?: string;
	message?: string;
	debuginfo?: string;
}

export interface MoodleConfig {
	baseUrl: string;
	token: string;
	service?: string;
}

export interface MoodleUser {
	id?: number;
	username: string;
	password?: string;
	firstname: string;
	lastname: string;
	email: string;
	auth?: string;
	idnumber?: string;
	lang?: string;
	calendartype?: string;
	theme?: string;
	timezone?: string;
	mailformat?: number;
	description?: string;
	city?: string;
	country?: string;
	firstnamephonetic?: string;
	lastnamephonetic?: string;
	middlename?: string;
	alternatename?: string;
}

export interface MoodleCourse {
	id?: number;
	fullname: string;
	shortname: string;
	categoryid: number;
	summary?: string;
	summaryformat?: number;
	format?: string;
	showgrades?: number;
	newsitems?: number;
	startdate?: number;
	enddate?: number;
	maxbytes?: number;
	showreports?: number;
	visible?: number;
	hiddensections?: number;
	groupmode?: number;
	groupmodeforce?: number;
	defaultgroupingid?: number;
}

export interface MoodleEnrollment {
	roleid: number;
	userid: number;
	courseid: number;
	timestart?: number;
	timeend?: number;
	suspend?: number;
}
