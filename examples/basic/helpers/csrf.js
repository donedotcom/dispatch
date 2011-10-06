/**
	CSRF helper tag
*/
exports.csrf_meta_tag = function (req, res) {
	return function () {
		return "<meta name='_csrf' content='" + req.session._csrf + "'></meta>";
	};
};

exports.csrf_form_field = function (req, res) {
	return function () {
		return "<input type='hidden' name='_csrf' value='" + req.session._csrf + "'/>";
	};
};