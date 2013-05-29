var memberModel = function (member) {
	var self = this;
	ko.mapping.fromJS(member, {}, self);
	self.membersImg = ko.computed(function() {
		if (self.avatarHash()) {
			return "https://trello-avatars.s3.amazonaws.com/" + self.avatarHash() + "/170.png";
		}
		return "";
	});
	
	self.firstName = ko.computed(function() {
		return self.fullName().split(" ")[0];
	});
	
	self.hasAvatar = ko.computed(function() {
		return self.avatarHash() != null;
	});
};

var cardModel = function (card) {
	var self = this;
	ko.mapping.fromJS(card, {
		'members' : {
			key: function (data) {
				return ko.utils.unwrapObservable(data.id);
			},
			create: function(options)  {
				return new memberModel(options.data);
			}
		}
	}, self);
	self.active = ko.observable(false);
	
	self.getCost = ko.computed(function() {
		var re = /\((\d+)\)$/;
		var cost = re.exec(self.name());
		if (cost) {
			return parseInt(cost[1]);
		}
		if (self.labels().length == 0) {
			return 0;
		}
		var label = self.labels()[0].name;
		if (!$.isNumeric(label)) {
			return 0;
		}
		return parseInt(label);
	});
	
	self.templateName = function() {
		if (self.name().match(/^http/))
		{
			return 'pageweb-template';
		} else {
			return 'backlog-template';
		}
	};
	
	self.dueDate = ko.computed(function() {
		if (!self.due()) {
			return "";
		}
		return new Date(self.due()).toDateString();
	});
	
	self.description = ko.computed(function() {
		var converter = new Markdown.Converter();
		return converter.makeHtml(self.desc());
	});
};

var cardList = function (cards) {
	var self = this;
	self.cards = ko.observableArray();
	self.update = function (cards) {
		ko.mapping.fromJS(cards, {
			key: function (data) {
				return ko.utils.unwrapObservable(data.id);
			},
			create: function(options)  {
				return new cardModel(options.data);
			}
		}, self.cards);
	};
	
	if (cards) {
		self.update(cards);
	}
};

var listModel = function (list) {
	var self = this;
	var mapping = {
		'cards' : {
			key: function (data) {
				return ko.utils.unwrapObservable(data.id);
			},
			create: function(options)  {
				return new cardModel(options.data);
			}
		}
	};
	ko.mapping.fromJS(list, mapping, self);
	
	if (!self.cards) {
		self.cards = ko.observableArray();
	}
	
	self.nbCards = ko.computed(function () {
		return self.cards().length;
	});
	self.cardsLoading = ko.observable(false);
	self.total = ko.computed(function() {
		var result = 0;
		$.each(self.cards(), function (i, card) { result = result + card.getCost(); });
		return result;
	});
	self.reload = function() {
		self.cardsLoading(true);
		Trello.get("lists/" + self.id() + "/cards?members=true", function (cards) {
			ko.mapping.fromJS(cards, mapping.cards, self.cards);
			self.cardsLoading(false);
		});
	};
	
	
	self.reload();
};



var boardModel = function (board) {
	var self = this;
	ko.mapping.fromJS(board, {}, self);
	self.boardLists = ko.observableArray();
	self.loading = ko.observable(false);
	self.updateLists = function() {
		self.loading(true);
		self.boardLists.removeAll();
		Trello.get("boards/" + self.id() + "/lists", function (lists) {
			ko.mapping.fromJS(lists, {
				key: function (data) {
					return ko.utils.unwrapObservable(data.id);
				},
				create: function(options)  {
					return new listModel(options.data);
				}
			}, self.boardLists);
			self.loading(false);
		});
	};
};

var viewModel = function() {
	var self = this;
	self.boards = ko.observableArray();
	self.loadBoards = function() {
		Trello.get("organizations/talentsoft/boards", function(boards) {
			ko.mapping.fromJS(boards, {
				key: function (data) {
					return ko.utils.unwrapObservable(data.id);
				},
				create: function(options)  {
					return new boardModel(options.data);
				}
			}, self.boards);
		});
	};
	self.enCoursLists = ko.observableArray();
	var lists = ["51a47b4b5436a5ee3e009048","5166751feedf1d4b4f001b6d"];
	self.loading = false;
	self.loadEnCours = function() {
		if (self.loading) return;
		self.loading = true;
		console.log("load");
		Trello.get("lists/5166751feedf1d4b4f001b6d", function (list) {
			self.enCoursLists.push(new listModel(list));
			Trello.get("lists/51a47b4b5436a5ee3e009048", function (list) {
				self.enCoursLists.push(new listModel(list));
				self.loading = false;
			});
		});
	};
	
	self.updateLists = function() {
		if (self.loading) return;
		console.log("update");
		var lists = self.enCoursLists();
		for (var i in lists)
		{
			lists[i].reload();
		}
		self.loading = false;
	};
	self.selectedBoard = ko.observable() ;
	
	self.authenticated = ko.observable(false);
	self.user = ko.observable();

	self.onAuthorize = function() {
		self.authenticated(Trello.authorized());
		Trello.get("member/me", function (member) {
			self.user(member.username);
		});
		self.loadBoards();
		self.loadEnCours();
	};
	
	self.login = function () {
		Trello.authorize({
			type: "popup",
			success: self.onAuthorize
		});
	};

	self.logout = function() {
		self.selectedBoard(undefined);
		self.boards.removeAll();
		Trello.deauthorize();
		self.authenticated(false);
	};
	
	self.selectedBoard.subscribe(function(newBoard) {
		if (newBoard != undefined && newBoard.boardLists().length == 0) {
			newBoard.updateLists();
		}
	});
	setInterval(self.updateLists, 10000);
};


$(document).ready(function() {
	var model = new viewModel();
	ko.applyBindings(model);
	$("body").removeClass("loading");//.fitText(8);
	Trello.authorize({
		interactive:false,
		success: model.onAuthorize
	});

});