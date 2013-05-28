var cardModel = function (card) {
	console.log(card);
	var self = jQuery.extend(this, card);
	self.active = ko.observable(false);
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
	self.description = function() {
		var converter = new Markdown.Converter();
		return converter.makeHtml(self.desc);
	};
	
	$.each(self.members, function(index, elt) {
		
		if (elt.avatarHash) {
			elt.hasAvatar = true;
			elt.membersImg = "https://trello-avatars.s3.amazonaws.com/" + elt.avatarHash + "/170.png";
		} else {
			elt.hasAvatar = false;
		}
	});
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
	self.reload = function() {
		self.cardsLoading(true);
		Trello.get("lists/" + self.id + "/cards?members=true", function (cards) {
			self.cards.removeAll();
			$.each(cards, function (i, card) {
				var cm = new cardModel(card);
				if (i == 0) {
					cm.active(true);
				}
				self.cards.push(cm);
			});
			self.cardsLoading(false);
		});
	};
	
	self.reload();
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
	self.enCoursList = ko.observable();
	self.loadEnCours = function() {
		Trello.get("lists/5166751feedf1d4b4f001b6d", function (enCours) {
			self.enCoursList(new listModel(enCours));
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
};


$(document).ready(function() {
	var model = new viewModel();
	ko.applyBindings(model);
	$("body").removeClass("loading");
	/*$(".carousel").carousel();*/
	Trello.authorize({
		interactive:false,
		success: model.onAuthorize
	});

});