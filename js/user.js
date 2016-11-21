var app = angular.module("CourseProposalApp");

app.controller("userCtrl", userCtrl);
app.factory("userSrv", userSrv);
app.directive("editDeptsModal", editDeptsModal);
app.directive("editPermissionsModal", editPermissionsModal);

userCtrl.$inject = ["$rootScope", "$scope", "depts", "userSrv"];
function userCtrl($rootScope, $scope, depts, userSrv) {
	$scope.user = $rootScope.user;
	$scope.depts = depts;
	$scope.updateDepts = userSrv.updateDepts;
	$scope.openEditModal= function(type) {
		var editModal;
		if (type == "depts"){
			editModal = angular.element("#more-user-data");
		} else if (type == "permissions") {
			editModal = angular.element("#permission-modal");
		}
		editModal.modal("show");
	}

}

userSrv.$inject = ["$rootScope", "$filter", "$log", "dataSrv", "authSrv"];
function userSrv($rootScope, $filter, $log, dataSrv, authSrv) {
	return {
		addToRecentlyViewed : addToRecentlyViewed,
		updateDepts : updateDepts
	}

	/**
	 *  takes a courseName and finds the corresponding course in the database. If there is a
	 *  proposal related to the course, finds that and adds it to the recently viewed. Returns
	 *  the course/proposal. 
	 *
	 *  @param courseName name of the course
	 *  @param courses courses to search (all)
	 *  @param allProposals proposals to search (all)
	 *  @return course/proposal object
	 */
	function addToRecentlyViewed(courseName, courses, allProposals) {
		//the course must exist in the database, so find it first
		var course = $filter("filter")(courses, {name: courseName}, true)[0];

		//check to see if it is in any proposals.
		var proposal = null;
		var index = 0;
		while (index < allProposals.elements.length && proposal == null) {
			var checkProposal = allProposals.elements[index];
			if ( (checkProposal.oldCourse && checkProposal.oldCourse.name == course.name) || checkProposal.newCourse.name == course.name) {
				proposal = checkProposal;
			}
			index++;
		}

		//if the course is in a proposal, use that instead of the plain course.
		if (proposal) {
			course = proposal;
		}

		//add course to recently viewed courses
		var courseIdx = $rootScope.user.recentlyViewed.indexOf(course._id.$oid);
		if (courseIdx == -1){
			$rootScope.user.recentlyViewed.unshift(course._id.$oid);
			if ($rootScope.user.recentlyViewed.length > 7) {
				$rootScope.user.recentlyViewed.pop();
			}
		} else {
			var lastViewed = $rootScope.user.recentlyViewed[0];
			$rootScope.user.recentlyViewed[0] = course._id.$oid;
			$rootScope.user.recentlyViewed[courseIdx] = lastViewed;
		}
		dataSrv.editUser($rootScope.user).then(function(data) {
			$log.info("Saved Recently Viewed");
		});
		return course;
	}


    function updateDepts(memberDepts) {
    	var modal = angular.element("#more-user-data");
    	modal.modal('hide');
    	angular.element(".modal-backdrop")[0].remove();
    	angular.element("body").removeClass("modal-open");
   		var user = $rootScope.user;
   		$log.debug("updating user", $rootScope.user);
   		user.dept = [];
   		user.division = [];
   		user.recentlyViewed = [];
   		angular.forEach(memberDepts, function(dept){
   			if (user.division.indexOf(dept.division) == -1) {
   				user.division.push(dept.division);
   			}
   			user.dept.push(dept.abbrev);
   		});
   		dataSrv.editUser(user).then(function(resp){
   			authSrv.userInfoFound(user);
   		}, function(err) {
   			$log.error("Unable to update user. Logging out...");
   			authSrv.logout();
   		});
   	}
}

editDeptsModal.$inject = ["$filter", "$log"];
function editDeptsModal($filter, $log) {
	return {
		restrict : "E",
		templateUrl : "templates/edit-departments.html",
		controller : ["$scope", function($scope) {	
			$scope.selectedDept;
			$scope.memberDepts = []; 
			if ($scope.user && $scope.user.dept.length > 0) {
				angular.forEach($scope.user.dept, function(d){
					$scope.memberDepts.push($filter("filter")($scope.depts, { abbrev : d})[0]);
				});
				$scope.selectedDept = $scope.memberDepts[0];
			}

		    $scope.addDept = function() {
		   		if ($scope.memberDepts.indexOf($scope.selectedDept) == -1){
		   			$scope.memberDepts.push($scope.selectedDept);
		   		}
		    }

		    $scope.removeDept = function(dept) {
		   		var index = $scope.memberDepts.indexOf(dept);
		   		$scope.memberDepts.splice(index,1);
		    } 
		}], 
		scope : {
			depts : "=",
			required : "=",
			user : "=",
			updateDepts : "="
		}
	}
}

editPermissionsModal.$inject = ["$log"];
function editPermissionsModal() {
	return {
		restrict : "E",
		templateUrl : "templates/edit-permissions.html",
		controller : ["$scope", function($scope) {

		}],
		scope : {

		}
	}
}