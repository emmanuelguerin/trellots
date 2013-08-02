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
	self.opened = ko.observable(false);
	self.open = function() {
		self.opened(!self.opened());
	};
	
	self.getCost = ko.computed(function() {
		return getCardCost(self.name());
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
	
	self.opened = ko.observable(false);
	
	if (!self.cards) {
		self.cards = ko.observableArray();
	}
	
	self.cleanName = ko.computed(function () {
		return getSprint({}, {name: self.name()});
	});
	
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
	
	self.open = function() {
		self.opened(!self.opened());
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
	
	self.total = ko.computed(function() {
		var result = 0;
		$.each(self.boardLists(), function (i, list) {
			result += list.total();
		});
		return result;
	});
};

var viewModel = function() {
	var self = this;
	trelloAuth.call(this);
	self.boards = ko.observableArray();
	self.loadBoards = function() {
		Trello.get("organizations/rdmanu/boards", function(boards) {
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
	
	self.authenticated.subscribe(function(authorized) {
		if (authorized) {
			self.loadBoards();
			self.loadEnCours();
		} else {
			self.selectedBoard(undefined);
			self.boards.removeAll();
		}
	});
	
	self.selectedBoard.subscribe(function(newBoard) {
		if (newBoard != undefined && newBoard.boardLists().length == 0) {
			newBoard.updateLists();
		}
	});
};


$(document).ready(function() {
	var model = new viewModel();
	ko.applyBindings(model);
	$("body").removeClass("loading");
	Trello.authorize({
		interactive:false,
		success: model.onAuthorize
	});

});