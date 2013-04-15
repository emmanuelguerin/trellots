var cardModel = function (card) {
	var self = jQuery.extend(this, card);
	self.getCost = function() {
		if (self.labels.length == 0) {
			return 0;
		}
		var label = self.labels[0].name;
		if (!$.isNumeric(label)) {
			return 0;
		}
		return parseInt(label);
	};
	self.dueDate = function() {
		if (!self.due) {
			return "";
		}
		return new Date(self.due).toDateString();
	};
};

var listModel = function (list) {
	var self = jQuery.extend(this,list);
	self.cards = ko.observableArray();
	self.nbCards = ko.computed(function () {
		return self.cards().length;
	});
	self.cardsLoading = ko.observable(true);
	self.total = ko.computed(function() {
		var result = 0;
		$.each(self.cards(), function (i, card) { result = result + card.getCost(); });
		return result;
	});
	Trello.get("lists/" + self.id + "/cards", function (cards) {
		$.each(cards, function (i, card) {
			self.cards.push(new cardModel(card));
		});
		self.cardsLoading(false);
	});
};

var boardModel = function (board) {
	var self = jQuery.extend(this, board);
	self.boardLists = ko.observableArray();
	self.loading = ko.observable(false);
	self.updateLists = function() {
		self.loading(true);
		self.boardLists.removeAll();
		Trello.get("boards/" + self.id + "/lists", function (lists) {
			self.loading(false);
			$.each(lists, function (i, list) {
				self.boardLists.push(new listModel(list));
			});
		});
	};
};

var viewModel = function() {
	var self = this;
	self.boards = ko.observableArray();
	self.loadBoards = function() {
		Trello.get("organizations/talentsoft/boards", function(boards) {
			self.boards($.map(boards, function(board) { return new boardModel(board);}));
		});
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