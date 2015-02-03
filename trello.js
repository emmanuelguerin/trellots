var getCardCost = function (cardName) {
		var re = /\((\d+)\)$/;
		var cost = re.exec(cardName);
		if (cost) {
			return parseInt(cost[1]);
		}
		return 0;
};

// small comment + other
var getCardPid = function (cardName) {
	var re = /(P\d+)/;
	var pid = re.exec(cardName);
	if (pid) return pid[1];
};

var cleanCardName = function (cardName) {
	cardName = cardName.replace(/\s*\(\d+\)$/, '');
	cardName = cardName.replace(/(\s*-)?\s*P\d+\s*(-\s*)?/, '');
	return cardName;
};

var getSprint = function (card, list) {
	var re = /Sprint\s+(\d+)/;
	var sprint = re.exec(list.name);
	if (sprint) {
		return sprint[1];
	}
	
	return list.name;
};

var trelloAuth = function() {
	var self=this;
	self.authenticated = ko.observable(false);
	self.user = ko.observable();

	self.onAuthorize = function() {
		Trello.get("member/me", function (member) {
			self.user(member.username);
		});
		self.authenticated(Trello.authorized());
	};
	
	self.login = function () {
		Trello.authorize({
			type: "popup",
			success: self.onAuthorize
		});
	};

	self.logout = function() {
		self.authenticated(false);
		Trello.deauthorize();
	};
	
	self.onLogin = function (event) {
		self.authenticated.subscribe(function (authenticated) {
			if (self.authenticated) event();
		});
	};
};
