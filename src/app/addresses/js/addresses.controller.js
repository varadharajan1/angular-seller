angular.module('orderCloud')
    .controller('AddressesCtrl', AddressesController)
;

function AddressesController($exceptionHandler, $state, $stateParams, $ocMedia, toastr, OrderCloud, OrderCloudParameters, ocAddresses, CurrentAssignments, AddressList, Parameters){
    var vm = this;
    vm.list = AddressList;
    vm.parameters = Parameters;
    vm.sortSelection = Parameters.sortBy ? (Parameters.sortBy.indexOf('!') == 0 ? Parameters.sortBy.split('!')[1] : Parameters.sortBy) : null;
    vm.changedAssignments = [];
    vm.userGroupID = $stateParams.usergroupid;

    //Check if search was used
    vm.searchResults = Parameters.search && Parameters.search.length > 0;

    //Reload the state with new parameters
    vm.filter = function(resetPage) {
        $state.go('.', OrderCloudParameters.Create(vm.parameters, resetPage));
    };

    //Reload the state with new search parameter & reset the page
    vm.search = function() {
        $state.go('.', OrderCloudParameters.Create(vm.parameters, true), {notify:false}); //don't trigger $stateChangeStart/Success, this is just so the URL will update with the search
        vm.searchLoading = OrderCloud.Addresses.List(vm.parameters.search, 1, vm.parameters.pageSize)
            .then(function(data) {
                vm.changedAssignments = [];
                vm.list = ocAddresses.Assignments.Map(CurrentAssignments, data);
                vm.searchResults = vm.parameters.search.length > 0;
            })
    };

    //Clear the search parameters, reload the state & reset the page
    vm.clearSearch = function() {
        vm.parameters.search = null;
        vm.filter(true);
    };

    //Clear relevant filters, reload the state & reset the page
    vm.clearFilters = function() {
        vm.parameters.filters = null;
        vm.parameters.from = null;
        vm.parameters.to = null;
        $ocMedia('max-width: 767px') ? vm.parameters.sortBy = null : angular.noop(); //Clear sort by on mobile devices
        vm.filter(true);
    };

    //Conditionally set, reverse, remove the sortBy parameters & reload the state
    vm.updateSort = function(value) {
        value ? angular.noop() : value = vm.sortSelection;
        switch(vm.parameters.sortBy) {
            case value:
                vm.parameters.sortBy = '!' + value;
                break;
            case '!' + value:
                vm.parameters.sortBy = null;
                break;
            default:
                vm.parameters.sortBy = value;
        }
        vm.filter(false);
    };

    //Reload the state with the incremented page parameter
    vm.pageChanged = function() {
        $state.go('.', {page:vm.list.Meta.Page});
    };

    //Load the next page of results with all of the same parameters
    vm.loadMore = function() {
        return OrderCloud.Addresses.List(Parameters.search, vm.list.Meta.Page + 1, Parameters.pageSize || vm.list.Meta.PageSize, Parameters.searchOn, Parameters.filters)
            .then(function(data) {
                var mappedData = ocAddresses.Assignments.Map(CurrentAssignments, data);
                vm.list.Items = vm.list.Items.concat(mappedData.Items);
                vm.list.Meta = mappedData.Meta;
            });
    };

    vm.createAddress = function() {
        ocAddresses.Create($stateParams.buyerid)
            .then(function(newAddress) {
                vm.list.Items.push(newAddress);
                vm.list.Meta.TotalCount++;
                vm.list.Meta.ItemRange[1]++;
                toastr.success(newAddress.AddressName + ' was created.', 'Success!');
            });
    };

    vm.editAddress = function(scope) {
        ocAddresses.Edit(scope.address, $stateParams.buyerid)
            .then(function(updatedAddress) {
                updatedAddress.shipping = vm.list.Items[scope.$index].shipping;
                updatedAddress.billing = vm.list.Items[scope.$index].billing;
                updatedAddress.userGroupID = vm.list.Items[scope.$index].userGroupID;
                vm.list.Items[scope.$index] = updatedAddress;
                if (updatedAddress.ID != scope.address.ID) {
                    _.map(CurrentAssignments, function(assignment) {
                        if (assignment.AddressID == scope.address.ID) assignment.AddressID = updatedAddress.ID;
                        return assignment;
                    });
                    vm.changedAssignments = ocAddresses.Assignments.Compare(CurrentAssignments, vm.list, $stateParams.usergroupid);
                }
                toastr.success(updatedAddress.AddressName + ' was updated.', 'Success!');
            })
    };

    vm.deleteAddress = function(scope) {
        ocAddresses.Delete(scope.address, $stateParams.buyerid)
            .then(function() {
                vm.list.Items.splice(scope.$index, 1);
                vm.list.Meta.TotalCount--;
                vm.list.Meta.ItemRange[1]--;
                toastr.success(scope.address.AddressName + ' was deleted.', 'Success!');
                vm.changedAssignments = ocAddresses.Assignments.Compare(CurrentAssignments, vm.list, $stateParams.usergroupid);
            });
    };

    vm.updateAssignments = function() {
        vm.searchLoading = ocAddresses.Assignments.Update(CurrentAssignments, vm.changedAssignments, $stateParams.buyerid)
            .then(function(data) {
                angular.forEach(data.Errors, function(ex) {
                    $exceptionHandler(ex);
                });
                CurrentAssignments = data.UpdatedAssignments;
                vm.changedAssignments = ocAddresses.Assignments.Compare(CurrentAssignments, vm.list, $stateParams.usergroupid);
            })
    };

    vm.allItemsSelected = false;
    vm.selectAllItems = function(type) {
        switch(type) {
            case 'shipping':
                vm.allShippingSelected = !vm.allShippingSelected;
                _.map(vm.list.Items, function(a) { a.shipping = vm.allShippingSelected });
                vm.changedAssignments = ocAddresses.Assignments.Compare(CurrentAssignments, vm.list, $stateParams.usergroupid);
                //select for shipping
                break;
            case 'billing':
                vm.allBillingSelected = !vm.allBillingSelected;
                _.map(vm.list.Items, function(a) { a.billing = vm.allBillingSelected });
                vm.changedAssignments = ocAddresses.Assignments.Compare(CurrentAssignments, vm.list, $stateParams.usergroupid);
                //select for billing
                break;
            default:
                break;
        }
    };

    vm.selectItem = function(scope, type) {
        switch(type) {
            case 'shipping':
                if (!scope.address.shipping) vm.allShippingSelected = false;
                vm.changedAssignments = ocAddresses.Assignments.Compare(CurrentAssignments, vm.list, $stateParams.usergroupid);
                //select for shipping
                break;
            case 'billing':
                if (!scope.address.billing) vm.allBillingSelected = false;
                vm.changedAssignments = ocAddresses.Assignments.Compare(CurrentAssignments, vm.list, $stateParams.usergroupid);
                //select for billing
                break;
            default:
                break;
        }
    };
}