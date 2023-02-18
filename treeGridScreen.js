import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import TREEGRID_ITEM_OBJECT from '@salesforce/schema/TreeGridObjItem__c';

import toggleActive            from '@salesforce/apex/TreeGridCtrl.toggleActive';
import getAllTreeGrid       from '@salesforce/apex/TreeGridCtrl.getAllTreeGrid';
import getTreeGridData     from '@salesforce/apex/TreeGridCtrl.getTreeGridData';
aaa
const HIERARCHY_VIEW_COLS = [
    { 
        label: "Name",
        type: "url",
        fieldName: "DetailURL",
        typeAttributes: { label: { fieldName: "Name" }, target: "_blank", tooltip: "View Detail"} 
    },

    {
        label: 'Active',
        type: 'boolean',
        fieldName: 'Active',
        initialWidth: 100,
    }
];

const HIERARCHY_EDITABLE_COLS = [
    { 
        label: "Name",
        type: "url",
        fieldName: "DetailURL",
        typeAttributes: { label: { fieldName: "Name" }, target: "_blank", tooltip: "View Detail"} 
    },

    {
        label: 'Active',
        type: 'boolean',
        fieldName: 'Active',
        initialWidth: 100,
    },

    { 
        label: "",
        type: 'button-icon',
        typeAttributes: {
            iconName: 'utility:multi_select_checkbox',
            name: 'toggleCheck',
            title: 'Toggle Check',
            alternativeText: 'Toggle Check',
            variant: 'bare',
        },
        initialWidth: 50,
    },
];

const SAVE_HIERARCHY_MESSAGE = 'Changes will be saved. Are you really sure?';
const CARD_TITLE = 'Organization Hierarchy';

export default class TreeGridScreen extends NavigationMixin(LightningElement) {

    /* *************************************************** PROPERTIES *************************************************** */
    hierarchyColumns = HIERARCHY_VIEW_COLS;
    saveHierarchyConfirmMessage = SAVE_HIERARCHY_MESSAGE;
    cardTitle = CARD_TITLE;

    // @api isInRecordPage = false;
    // @api recordId;
    // @api objectApiName;
    targetObjectApiName = 'TreeGridObj__c';
    newestTreeGridObjId;
    toastMessage;
    treeGridObjItemList = [];
    showLoadingSpinner = false;
    isExpandBtnSelected = false;
    saveHierarchyButtonDisabled = true;
    hasEditAccess = false;
    treeGridObjList = []; 

    get expandButtonVariant() {
        return this.isExpandBtnSelected ? 'brand' : 'neutral';
    }

    get disabledSaveButton() {
        return (this.treeGridObjItemList.length <= 0);
    }

    @wire(getObjectInfo, { objectApiName: TREEGRID_ITEM_OBJECT })
    orgItemObjectInfo(result, error) {
        if (result && result.data) {
            let isEditalbeObjectPermission = result.data.updateable;
            let isEditableFieldPermission = result.data.fields.Active__c.updateable;

            this.hasEditAccess = isEditalbeObjectPermission && isEditableFieldPermission;
            this.hierarchyColumns = this.hasEditAccess? HIERARCHY_EDITABLE_COLS : HIERARCHY_VIEW_COLS;
        }
    };

    /* *************************************************** FUNCTIONS *************************************************** */
    connectedCallback() {  
        this.initTreeGridObjComboBox();
    }

    hasRendered  = false;
    renderedCallback() {
        if (!this.hasRendered && this.treeGridObjItemList.length > 0) {
            const grid =  this.template.querySelector('lightning-tree-grid');
            this.isExpandBtnSelected = true;
            grid.expandAll();
            this.hasRendered = true;
        }
    }

    initTreeGridObjComboBox() {
        getAllTreeGrid({})
        .then(result => {
            
            // get latest created TreeGridObj__c.Id
            this.newestTreeGridObjId = result.length > 0 ? result[result.length - 1].Id : null;
            // if this component is in a home page, app page or a record page of other sobjectType but 'TreeGridObj__c', 
            // display the newest organizationMgmt hierarchy
            this.recordId = (this.recordId == null || this.objectApiName != this.targetObjectApiName) ? this.newestTreeGridObjId : this.recordId;
            this.getTreeGridData();
            
            let option = [];

            result.forEach((item) => {
                option.push({ label: item.Name, value: item.Id});
            });
            this.treeGridObjList = option;
        })
        .catch(error => {
            this.getErrorMessage(error);
            this.showToastMessage(this.cardTitle, this.toastMessage, 'error');
        })
    }

    updateRecordView() {
        setTimeout(() => {
             eval("$A.get('e.force:refreshView').fire();");
        }, 1000); 
     }

    getTreeGridData() {
        this.showLoadingSpinner = true;
        
        getTreeGridData({treeGridId : this.recordId})
        .then(result => {
            // thanhdang.nguyen 2023/02/16 Mod Start
            // let validJSONString;
            // validJSONString = result.replaceAll(',\"children\":null', '');
            // validJSONString = validJSONString.replaceAll('children', '_children');
            // this.treeGridObjItemList = JSON.parse(validJSONString);
            
            let tempData = JSON.parse(result);
            this.formatDataForTreeGrid(tempData);

            this.treeGridObjItemList = tempData;
            // thanhdang.nguyen 2023/02/16 Mod End
        })
        .catch(error => {
            this.getErrorMessage(error);
            this.showToastMessage(this.cardTitle, this.toastMessage, 'error');
        }) 
        .finally(() => {
            this.showLoadingSpinner = false;
        })
    }

    formatDataForTreeGrid(data) {
        if (Array.isArray(data)) {
            data.forEach(ele => this.formatDataForTreeGrid(ele));
        } else if (data.children) {
            this.formatDataForTreeGrid(data.children);
            data._children = data.children;
            delete data.children;
        } else {
            delete data.children;
        }
    }

    handleTreeGridObjChanged(event) {
        this.recordId = event.detail.value;
        this.getTreeGridData();

        this.hasRendered = false;
        this.treeGridObjItemList = [];
    }

    // saveHierarchy() {
    //     var submit = confirm(this.saveHierarchyConfirmMessage);

    //     if (submit) {
    //         this.showLoadingSpinner = true;

    //         // update organization hierarchy
    //         const selectedRows = this.template.querySelector('lightning-tree-grid').getSelectedRows();
    //         let selectedRowIds = [];

    //         for (let i = 0; i < selectedRows.length; i++) {
    //             selectedRowIds.push(selectedRows[i].Id);
    //         }

    //         updateOrgHierarchy({selectedOrganizationItemsIds: selectedRowIds, treeGridId: this.recordId})
    //         .then(result => {
    //             if (result) {
    //                 this.toastMessage = 'Saved successfully!';
    //                 this.showToastMessage(this.cardTitle, this.toastMessage, 'success');
    //                 this.refreshOrgHirerchy();
    //             } else {
    //                 this.toastMessage = 'Some errors occur. Contact your admin.';
    //                 this.showToastMessage(this.cardTitle, this.toastMessage, 'error');
    //             }
    //         })
    //         .catch(error => {
    //             this.getErrorMessage(error);
    //             this.showToastMessage(this.cardTitle, this.toastMessage, 'error');
    //         })
    //         .finally(() => {
    //             this.showLoadingSpinner = false;
    //         })
    //     }
    // }

    // handleRowSelection(event) {
    //     const selectedRows = event.detail.selectedRows;
    //     selectedRows[0].SalesTarget = true;
    //     console.log(selectedRows);
    //     alert(selectedRows.Name);
    // }

    handleExpandButtonClick() {
        const grid =  this.template.querySelector('lightning-tree-grid');
        this.isExpandBtnSelected = !this.isExpandBtnSelected;

        if (this.isExpandBtnSelected) {
            grid.expandAll();
        } else {
            grid.collapseAll();
        }
    }

    refreshOrgHirerchy() {
        
        // get data from server
        this.getTreeGridData();
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        switch (actionName) {
            case 'show_details':
                this[NavigationMixin.GenerateUrl] ({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: row.Id,
                        objectApiName: 'TreeGridObjItem__c',
                        actionName: 'view'
                    }
                }).then(url => { window.open(url) });

                // this[NavigationMixin.Navigate] ({
                // });
                break;

            case 'toggleCheck':
                // let jsonStr = JSON.stringify(this.treeGridObjItemList);
                // console.log(jsonStr);
                // console.log(row.Id);
                // console.log(row.Name);
                // console.log(JSON.stringify(row));
                // jsonStr = jsonStr.replace('\"SalesTarget\":false', '\"SalesTarget\":true');
                // this.treeGridObjItemList = JSON.parse(jsonStr);
                
                this.showLoadingSpinner = true;
                
                toggleActive({itemId: row.Id})
                .then(result => {
                    this.toastMessage = 'The changes have been made.';
                    this.showToastMessage(this.toastMessage, null, 'success');

                    // refresh data
                    this.refreshOrgHirerchy();
                    if (this.isInRecordPage) {
                        this.updateRecordView();
                    }
                })
                .catch(error => {
                    this.getErrorMessage(error);
                    this.showToastMessage(this.cardTitle, this.toastMessage, 'error');
                }) 
                .finally(() => {
                    this.showLoadingSpinner = false;
                })
                break;
                
            default:
        }
    }

    // initialize error messages depend on server/client error
    getErrorMessage(error) {
        if (error.body) {
            this.toastMessage = error.body.message;
        } else if (typeof error.message === 'string') {
            this.toastMessage = error.message;
        }        
    }

    showToastMessage(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });

        this.dispatchEvent(event);
    }
}