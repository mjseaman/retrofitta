/**
 * Describe Salesforce object to be used in the app. For example: Below AngularJS factory shows how to describe and
 * create an 'Contact' object. And then set its type, fields, where-clause etc.
 *
 *  PS: This module is injected into ListCtrl, EditCtrl etc. controllers to further consume the object.
 */
angular.module('Contact', []).factory('Contact', function (AngularForceObjectFactory) {
    //Describe the contact object
    console.log("in contact module");
    var objDesc = {
        type: 'Contact',
        fields: ['FirstName', 'LastName', 'Title', 'Phone', 'Email', 'Id', 'Account.Name'],
        where: '',
        orderBy: 'LastName',
        limit: 20
    };
    var Contact = AngularForceObjectFactory(objDesc);

    return Contact;
}); 

angular.module('Building__c', []).factory('Building__c', function (AngularForceObjectFactory) {
    console.log("in building module");
    //Describe the building object
    var objDesc = {
        type: 'Building__c',
        fields: ['Name', 'air_flow_control__c', 'Climate_Zone__c', 'Cooling__c', 'floor_area__c', 'Heating__c', 'wall_insulation_r_value__c', 'window_glass_type__c', 'window_glass_layers__c', 'zip_code__c', 'classification_type__c'],
        where: '',
        orderBy: 'floor_area__c',
        limit: 20
    };
    var Building__c = AngularForceObjectFactory(objDesc);

    return Building__c;
});


function HomeCtrl($scope, AngularForce, $location, $route) {
    var isOnline =  AngularForce.isOnline();
    var isAuthenticated = AngularForce.authenticated();

    //Offline support (only for Cordova)
    //First check if we are online, then check if we are already authenticated (usually happens in Cordova),
    //If Both online and authenticated(Cordova), go directly to /contacts view. Else show login page.
    if(!isOnline) {
        if(!isAuthenticated) {//MobileWeb
            return $location.path('/login');
        } else {//Cordova
            return $location.path('/contacts/');
        }
    }

    //If in visualforce, directly login
    if (AngularForce.inVisualforce) {
        $location.path('/login');
    } else if (AngularForce.refreshToken) { //If web, try to relogin using refresh-token
        AngularForce.login(function () {
            $location.path('/contacts/');
            $scope.$apply();//Required coz sfdc uses jquery.ajax
        });
    } else {
        $location.path('/login');
    }
}

function LoginCtrl($scope, AngularForce, $location) {
    //Usually happens in Cordova
    if (AngularForce.authenticated()) {
        return $location.path('/contacts/');
    }

    $scope.login = function () {
        //If in visualforce, 'login' = initialize entity framework
        if (AngularForce.inVisualforce) {
           AngularForce.login(function() {
            $location.path('/contacts/');
           });     
        } else {
            AngularForce.login();           
        }
    };



    $scope.isLoggedIn = function () {
        return AngularForce.authenticated();
    };

    $scope.logout = function () {
        AngularForce.logout(function () {
            //Now go to logout page
            $location.path('/logout');
            $scope.$apply();
        });
    };
}

function CallbackCtrl($scope, AngularForce, $location) {
    AngularForce.oauthCallback(document.location.href);

    //Note: Set hash to empty before setting path to /contacts to keep the url clean w/o oauth info.
    //..coz oauth CB returns access_token in its own hash making it two hashes (1 from angular,
    // and another from oauth)
    $location.hash('');
    $location.path('/contacts');
}

function ContactListCtrl($scope, AngularForce, $location, Contact) {
    if (!AngularForce.authenticated()) {
        return $location.path('/home');
    }

    $scope.searchTerm = '';
    $scope.working = false;

    Contact.query(function (data) {
        $scope.contacts = data.records;
        $scope.$apply();//Required coz sfdc uses jquery.ajax
    }, function (data) {
        alert('Query Error');
    });

    $scope.isWorking = function () {
        return $scope.working;
    };

    $scope.doSearch = function () {
        Contact.search($scope.searchTerm, function (data) {
            $scope.contacts = data;
            $scope.$apply();//Required coz sfdc uses jquery.ajax
        }, function (data) {
        });
    };

    $scope.doView = function (contactId) {
        console.log('doView');
        $location.path('/view/' + contactId);
    };

    $scope.doCreate = function () {
        $location.path('/new');
    }
}

function ContactCreateCtrl($scope, $location, Contact) {
    $scope.save = function () {
        Contact.save($scope.contact, function (contact) {
            var c = contact;
            $scope.$apply(function () {
                $location.path('/view/' + c.Id);
            });
        });
    }
}

function ContactViewCtrl($scope, AngularForce, $location, $routeParams, Contact) {

    AngularForce.login(function () {
        console.log($scope);
        Contact.get({id: $routeParams.contactId}, function (contact) {
            self.original = contact;
            $scope.contact = new Contact(self.original);
            $scope.$apply();//Required coz sfdc uses jquery.ajax
        });
    });

}

function ContactDetailCtrl($scope, AngularForce, $location, $routeParams, Contact) {
    var self = this;

    if ($routeParams.contactId) {
        AngularForce.login(function () {
            Contact.get({id: $routeParams.contactId},
                function (contact) {
                    self.original = contact;
                    $scope.contact = new Contact(self.original);
                    $scope.$apply();//Required coz sfdc uses jquery.ajax
                });
        });
    } else {
        $scope.contact = new Contact();
        //$scope.$apply();
    }

    $scope.isClean = function () {
        return angular.equals(self.original, $scope.contact);
    }

    $scope.destroy = function () {
        self.original.destroy(
            function () {
                $scope.$apply(function () {
                    $location.path('/contacts');
                });
            },
            function (errors) {
                alert("Could not delete contact!\n" + JSON.parse(errors.responseText)[0].message);
            }
        );
    };

    $scope.save = function () {
        if ($scope.contact.Id) {
            $scope.contact.update(function () {
                $scope.$apply(function () {
                    $location.path('/view/' + $scope.contact.Id);
                });

            });
        } else {
            Contact.save($scope.contact, function (contact) {
                var c = contact;
                $scope.$apply(function () {
                    $location.path('/view/' + c.Id || c.id);
                });
            });
        }
    };

    $scope.doCancel = function () {
        if ($scope.contact.Id) {
            $location.path('/view/' + $scope.contact.Id);
        } else {
            $location.path('/contacts');
        }
    }
}

//**************** BUILDING CONTROLLERS ******************//

function BuildingListCtrl($scope, AngularForce, $location, Building__c) {
    if (!AngularForce.authenticated()) {
        return $location.path('/home');
    }

    console.log("In BuildingListCtrl");

    $scope.searchTerm = '';
    $scope.working = false;

    Building__c.query(function (data) {
        $scope.buildings = data.records;
        $scope.$apply();//Required coz sfdc uses jquery.ajax
    }, function (data) {
        alert('Query Error');
    });

    $scope.isWorking = function () {
        return $scope.working;
    };

    $scope.doSearch = function () {
        Building__c.search($scope.searchTerm, function (data) {
            $scope.buildings = data;
            $scope.$apply();//Required coz sfdc uses jquery.ajax
        }, function (data) {
        });
    };

    $scope.doView = function (buildingId) {
        console.log('doView');
        $location.path('/view/' + buildingId);
    };

    $scope.doCreate = function () {
        $location.path('/new');
    }
}

function BuildingCreateCtrl($scope, $location, Building) {
    $scope.save = function () {
        Building.save($scope.building, function (building) {
            var p = building;
            $scope.$apply(function () {
                $location.path('/view/' + p.Id);
            });
        });
    }
}

function BuildingViewCtrl($scope, AngularForce, $location, $routeParams, Building) {

    AngularForce.login(function () {
        Building.get({id: $routeParams.buildingId}, function (building) {
            self.original = building;
            $scope.building = new Building(self.original);
            $scope.$apply();//Required coz sfdc uses jquery.ajax
        });
    });

}

function BuildingDetailCtrl($scope, AngularForce, $location, $routeParams, Property__c) {
    var self = this;

    if ($routeParams.buildingId) {
        AngularForce.login(function () {
            Building.get({id: $routeParams.buildingId},
                function (building) {
                    self.original = building;
                    $scope.building = new Building(self.original);
                    $scope.$apply();//Required coz sfdc uses jquery.ajax
                });
        });
    } else {
        $scope.building = new Building();
        //$scope.$apply();
    }

    $scope.isClean = function () {
        return angular.equals(self.original, $scope.building);
    }

    $scope.destroy = function () {
        self.original.destroy(
            function () {
                $scope.$apply(function () {
                    $location.path('/buildings');
                });
            },
            function (errors) {
                alert("Could not delete building!\n" + JSON.parse(errors.responseText)[0].message);
            }
        );
    };

    $scope.save = function () {
        if ($scope.building.Id) {
            $scope.building.update(function () {
                $scope.$apply(function () {
                    $location.path('/view/' + $scope.building.Id);
                });

            });
        } else {
            Building.save($scope.building, function (building) {
                var p = building;
                $scope.$apply(function () {
                    $location.path('/view/' + p.Id || p.id);
                });
            });
        }
    };

    $scope.doCancel = function () {
        if ($scope.building.Id) {
            $location.path('/view/' + $scope.building.Id);
        } else {
            $location.path('/buildings');
        }
    }
}
