'use strict'

Ext.ns('SM')

SM.WorkflowComboBox = Ext.extend(Ext.form.ComboBox, {
    initComponent: function() {
        let config = {
            displayField: 'display',
            valueField: 'value',
            triggerAction: 'all',
            mode: 'local',
            editable: false      
        }
        let me = this
        let data = [
            ['continuous','Continuous'],
            ['emass', 'RMF Collection']
        ]
        this.store = new Ext.data.SimpleStore({
            fields: ['value','display']
        })
        this.store.on('load',function(store){
            me.setValue(store.getAt(0).get('value'))
        })

        Ext.apply(this, Ext.apply(this.initialConfig, config))
        SM.WorkflowComboBox.superclass.initComponent.call(this)

        this.store.loadData(data)
    }
})
Ext.reg('sm-workflow-combo', SM.WorkflowComboBox);

SM.AccessLevelStrings = [
    'Undefined',
    'Assignments',
    'All resources',
    'Configuration',
    'Owner'
]

SM.AccessLevelField = Ext.extend(Ext.form.ComboBox, {
    initComponent: function() {
        let config = {
            displayField: 'display',
            valueField: 'value',
            triggerAction: 'all',
            mode: 'local',
            editable: false      
        }
        let me = this
        let data = [
            [1, SM.AccessLevelStrings[1]],
            [2, SM.AccessLevelStrings[2]],
            [3, SM.AccessLevelStrings[3]],
            [4, SM.AccessLevelStrings[4]],
        ]
        this.store = new Ext.data.SimpleStore({
            fields: ['value','display']
        })
        this.store.on('load',function(store){
            me.setValue(store.getAt(0).get('value'))
        })

        Ext.apply(this, Ext.apply(this.initialConfig, config))
        SM.AccessLevelField.superclass.initComponent.call(this)

        this.store.loadData(data)
    }
})
Ext.reg('sm-accesslevel-field', SM.AccessLevelField);

SM.MetadataGrid = Ext.extend(Ext.grid.GridPanel, {
    initComponent: function() {
        let id = Ext.id()
        let fields = ['key','value']
        let newFields = ['key','value']
        let fieldsConstructor = Ext.data.Record.create(fields) 
        this.newRecordConstructor = Ext.data.Record.create(newFields)
        this.editor =  new Ext.ux.grid.RowEditor({
            saveText: 'Save',
            grid: this,
            clicksToEdit: 2,
            errorSummary: false, // don't display errors during validation monitoring
            listeners: {
                canceledit: function (editor,forced) {
                    // The 'editing' property is set by RowEditorToolbar.js
                    if (editor.record.editing === true) { // was the edit on a new record?
                        this.grid.store.suspendEvents(false);
                        this.grid.store.remove(editor.record);
                        this.grid.store.resumeEvents();
                        this.grid.getView().refresh();
                    }
                },
                afteredit: function (editor, changes, record, index) {
                    // "Save" the record by reconfiguring the store's data collection
                    let mc = record.store.data
                    let generatedId = record.id
                    record.id = record.data.key
                    record.phantom = false

                    delete mc.map[generatedId]
                    mc.map[record.id] = record
                    for (let x=0,l=mc.keys.length; x<l; x++) {
                        if (mc.keys[x] === generatedId) {
                            mc.keys[x] = record.id
                        }
                    }
                }

            }
        })
        this.totalTextCmp = new Ext.Toolbar.TextItem ({
            text: '0 records',
            width: 80
        })
        let writer = new Ext.data.DataWriter()
        let config = {
            //title: this.title || 'Parent',
            isFormField: true,
            allowBlank: true,
            layout: 'fit',
            height: 150,
            border: true,
            plugins: [this.editor],
            style: {
            },
            listeners: {
            },
            store: new Ext.data.ArrayStore ({
                grid: this,
                writer: writer,
                autoSave: false,
                fields: fieldsConstructor,
                sortInfo: {
                    field: 'key',
                    direction: 'ASC'
                },
                root: '',
                restful: true,
                idProperty: 'key',
                listeners: {
                }
            }),
            view: new Ext.grid.GridView({
                emptyText: this.emptyText || 'No records to display',
                deferEmptyText: false,
                forceFit:true
            }),
            sm: new Ext.grid.RowSelectionModel ({
                singleSelect: true,
                listeners: {
                    // rowselect: function(sm,index,record) {
                    //     // If the editor is active the new record will be a phantom
                    //     if (record.phantom !== true) {
                    //         let loadObj = {
                    //             params: {}
                    //         }
                    //         //loadObj.params[sm.grid.child.store.idProperty] = record.data[sm.grid.child.store.idProperty]
                    //         loadObj.params[sm.grid.store.idProperty] = record.data[sm.grid.store.idProperty]
                    //         // clear selections from control grid
                    //         sm.grid.child.child.apiResponse([{}])
                    //         sm.grid.child.store.removeAll(true)
                    //         sm.grid.child.store.load(loadObj)
                    //     }
                    // }
                }
            }),
            cm: new Ext.grid.ColumnModel ({
                columns: [
                    {
                        header: "Key", 
                        dataIndex: 'key',
                        sortable: true,
                        width: 150,
                        editor: new Ext.form.TextField({
                            grid: this,
                            submitValue:false,
                            validator: function (v) {
                                // Don't keep the form from validating when I'm not active
                                if (this.grid.editor.editing == false) {
                                    return true
                                }
                                if (v === "") { return "Blank values no allowed" }
                                // Is there an item oin the store like me?
                                let searchIdx = this.grid.store.findExact('key',v)
                                // Is it me?
                                let isMe = this.grid.selModel.isSelected(searchIdx)
                                if (searchIdx == -1 || isMe) {
                                    return true
                                } else {
                                    return "Duplicate keys not allowed"
                                }
                            }
                        })
                    },
                    {
                        header: "Value", 
                        dataIndex: 'value',
                        sortable: false,
                        width: 250,
                        editor: new Ext.form.TextField({
                            submitValue:false
                        })
                    }
                ]   
            }),
            bbar: new SM.RowEditorToolbar({
                itemString: 'key',
                editor: this.editor,
                gridId: this.id,
                deleteProperty: 'key',
                newRecord: this.newRecordConstructor
            }),
            getValue: function() {
                let value = {}
                this.store.data.items.forEach((i) => {
                    value[i.data.key] = i.data.value
                })
                return value
            },
            markInvalid: function() {},
            clearInvalid: function() {},
            isValid: function() { 
                return true
            },
            disabled: false,
            getName: function() {return this.name},
            validate: function() { return true},
            setValue: function(v) {
                this.store.loadData(Object.entries(v))
            }
        }
        Ext.apply(this, Ext.apply(this.initialConfig, config))
        SM.MetadataGrid.superclass.initComponent.call(this);
    }
})
Ext.reg('sm-metadata-grid', SM.MetadataGrid)

SM.UserSelectionField = Ext.extend( Ext.form.ComboBox, {
    initComponent: function() {
        const userStore = new Ext.data.JsonStore({
            fields: [
                {	name:'userId',
                    type: 'string'
                },{
                    name:'username',
                    type: 'string'
                }
            ],
            autoLoad: true,
            url: `${STIGMAN.Env.apiBase}/users`,
            root: '',
            sortInfo: {
                field: 'username',
                direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
            },
            idProperty: 'userId'
        })
        const config = {
            store: userStore,
            filteringStore: this.filteringStore || null,
            displayField: 'username',
            valueField: 'userId',
            mode: 'local',
            forceSelection: true,
			allowBlank: true,
			typeAhead: true,
			minChars: 0,
            hideTrigger: false,
            triggerAction: 'all',
            lastQuery: '',
			doQuery : function(q, forceAll){
				q = Ext.isEmpty(q) ? '' : q;
				var qe = {
					query: q,
					forceAll: forceAll,
					combo: this,
					cancel:false
				};
				if(this.fireEvent('beforequery', qe)===false || qe.cancel){
					return false;
				}
				q = qe.query;
				forceAll = qe.forceAll;
				if(forceAll === true || (q.length >= this.minChars)){
					if(this.lastQuery !== q){
						this.lastQuery = q;
						if(this.mode == 'local'){
							this.selectedIndex = -1;
							if(forceAll){
								this.store.clearFilter();
							}else{
								this.store.filter(this.displayField, q, false, false);
							}
							this.onLoad();
						}else{
							this.store.baseParams[this.queryParam] = q;
							this.store.load({
								params: this.getParams(q)
							});
							this.expand();
						}
					}else{
						this.selectedIndex = -1;
						this.onLoad();
					}
                }
            },
            listeners: {
                afterrender: (combo) => {
                    combo.getEl().dom.setAttribute('spellcheck', 'false')
                },
                expand: (combo) => {
                    if (combo.filteringStore) {
                        combo.store.filterBy(
                            function (record, id) {
                                return combo.filteringStore.indexOfId(id) === -1
                            }
                        )
                    }
                }
            }       
        }
        Ext.apply(this, Ext.apply(this.initialConfig, config))
        SM.UserSelectionField.superclass.initComponent.call(this)
    }
})
Ext.reg('sm-user-selection-field', SM.UserSelectionField);

SM.UserGrantsGrid = Ext.extend(Ext.grid.GridPanel, {
    initComponent: function() {
        const me = this
        const fields = [
            { 
                name: 'userId',
                mapping: 'user.userId'
            },
            {
                name: 'username',
                mapping: 'user.username'
            },
            {
                name: 'accessLevel'
            }
        ]
        const newFields = [
            { 
                name: 'userId'
            },
            {
                name: 'username'
            },
            {
                name: 'accessLevel'
            }
        ]
        this.newRecordConstructor = Ext.data.Record.create(newFields)
        const totalTextCmp = new Ext.Toolbar.TextItem ({
            text: '0 records',
            width: 80
        })
        this.proxy = new Ext.data.HttpProxy({
            restful: true,
            url: this.url,
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            listeners: {
                exception: function ( proxy, type, action, options, response, arg ) {
                    let message
                    if (response.responseText) {
                        message = response.responseText
                    } else {
                        message = "Unknown error"
                    }
                    Ext.Msg.alert('Error', message);
                }
            }
        })
        const grantStore = new Ext.data.JsonStore({
            grid: this,
            proxy: this.proxy,
            baseParams: this.baseParams,
            root: '',
            fields: newFields,
            idProperty: 'userId',
            sortInfo: {
                field: 'username',
                direction: 'ASC' // or 'DESC' (case sensitive for local sorting)
            },
            listeners: {
                load: function (store,records) {
                    totalTextCmp.setText(records.length + ' records');
                },
                remove: function (store,record,index) {
                    totalTextCmp.setText(store.getCount() + ' records');
                }
            }
        })
        const userSelectionField = new SM.UserSelectionField({
            submitValue: false,
            allowBlank: false,
            filteringStore: grantStore
        })
        const accessLevelField = new SM.AccessLevelField({
            submitValue: false,
            allowBlank: false
        })
        const columns = [
            { 	
				header: "Username",
				width: 150,
                dataIndex: 'username',
                sortable: true,
                editor: userSelectionField
            },
            { 	
				header: "Access Level",
				width: 100,
                dataIndex: 'accessLevel',
                sortable: true,
                renderer: (v) => SM.AccessLevelStrings[v],
                editor: accessLevelField
            }
        ]
        this.editor =  new Ext.ux.grid.RowEditor({
            saveText: 'Save',
            grid: this,
            userSelectionField: userSelectionField,
            accessLevelField: accessLevelField,
            clicksToEdit: 2,
            errorSummary: false, // don't display errors during validation monitoring
            listeners: {
                validateedit: function (editor, changes, record, index) {
                    // RowEditor unhelpfully sets changes.username to the userId value. 
                    if (changes.hasOwnProperty('username')) {
                        let userEditor = editor.userSelectionField
                        let userRecord = userEditor.store.getAt(userEditor.selectedIndex) 
                        changes.username = userRecord.data.username
                        changes.userId = userRecord.data.userId
                    }
                },
                canceledit: function (editor,forced) {
                    // The 'editing' property is set by RowEditorToolbar.js
                    if (editor.record.editing === true) { // was the edit on a new record?
                        this.grid.store.suspendEvents(false);
                        this.grid.store.remove(editor.record);
                        this.grid.store.resumeEvents();
                        this.grid.getView().refresh();
                    }
                },
                afteredit: function (editor, changes, record, index) {
                    // "Save" the record by reconfiguring the store's data collection
                    // Corrects the bug where new records don't deselect when clicking away
                    let mc = record.store.data
                    let generatedId = record.id
                    record.id = record.data.userId
                    record.phantom = false
                    record.dirty = false
                    delete mc.map[generatedId]
                    mc.map[record.id] = record
                    for (let x=0,l=mc.keys.length; x<l; x++) {
                        if (mc.keys[x] === generatedId) {
                            mc.keys[x] = record.id
                        }
                    }
                }

            }
        })
        const config = {
            //title: this.title || 'Parent',
            isFormField: true,
            name: 'grants',
            allowBlank: true,
            layout: 'fit',
            height: 150,
            plugins: [this.editor],
            store: grantStore,
            cm: new Ext.grid.ColumnModel ({
                columns: columns   
            }),
            sm: new Ext.grid.RowSelectionModel({
                singleSelect: true,
                listeners: {
                    selectionchange: function (sm) {
                    }
                }
            }),
            view: new Ext.grid.GridView({
                emptyText: this.emptyText || 'No records to display',
                deferEmptyText: false,
                forceFit: true,
                markDirty: false
            }),
            listeners: {
            },
            tbar: new SM.RowEditorToolbar({
                itemString: 'Grant',
                editor: this.editor,
                gridId: this.id,
                deleteProperty: 'userId',
                newRecord: this.newRecordConstructor
            }),

            getValue: function() {
                let grants = []
                grantStore.data.items.forEach((i) => {
                    grants.push({
                        userId: i.data.userId,
                        accessLevel: i.data.accessLevel
                    })
                })
                return grants
            },
            setValue: function(v) {
                const data = v.map( (g) => ({
                    userId: g.user.userId,
                    username: g.user.username,
                    accessLevel: g.accessLevel
                }))
                grantStore.loadData(data)
            },
            markInvalid: function() {},
            clearInvalid: function() {},
            isValid: () => true,
            getName: () => this.name,
            validate: () => true
        }

        Ext.apply(this, Ext.apply(this.initialConfig, config))
        SM.UserGrantsGrid.superclass.initComponent.call(this)
    }
})
Ext.reg('sm-user-grants-grid', SM.UserGrantsGrid);

SM.CollectionForm = Ext.extend(Ext.form.FormPanel, {
    initComponent: function() {
        let config = {
            baseCls: 'x-plain',
            border: false,
            labelWidth: 100,
            monitorValid: true,
            getFieldValues: function (dirtyOnly) {
                // Override Ext.form.FormPanel implementation to check submitValue
                let o = {}, n, key, val;
                this.items.each(function(f) {
                    if (f.submitValue !== false && !f.disabled && (dirtyOnly !== true || f.isDirty())) {
                        n = f.getName()
                        key = o[n]
                        val = f.getValue()   
                        if (Ext.isDefined(key)){
                            if (Ext.isArray(key)){
                                o[n].push(val);
                            } else {
                                o[n] = [key, val]
                            }
                        } else {
                            o[n] = val
                        }
                    }
                })
                return o
            },
            items: [
                {
                    xtype: 'fieldset',
                    title: '<b>Collection information</b>',
                    items: [
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Name',
                            name: 'name',
                            allowBlank: false,
                            anchor:'100%'  // anchor width by percentage
                        },{
                            xtype: 'sm-workflow-combo',
                            fieldLabel: 'Workflow',
                            name: 'workflow',
                            margins: '0 10 0 0',
                            width: 200
                        },{
                            xtype: 'sm-metadata-grid',
                            fieldLabel: 'Metadata',
                            name: 'metadata',
                            anchor: '100%'
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    title: '<b>Access Control</b>',
                    items: [
                        {
                            xtype: 'sm-user-grants-grid',
                            fieldLabel: 'Grants',
                            anchor: '100%'
                        }
                    ]
                }
            ],
            buttons: [{
                text: this.btnText || 'Save',
                formBind: true,
                handler: this.btnHandler || function () {}
            }]
        }
        Ext.apply(this, Ext.apply(this.initialConfig, config))
        SM.CollectionForm.superclass.initComponent.call(this);
    }
})

SM.CollectionPanel = Ext.extend(Ext.form.FormPanel, {
// SM.CollectionPanel = Ext.extend(Ext.Panel, {
        initComponent: function() {
        let config = {
            // baseCls: 'x-plain',
            // border: false,
            labelWidth: 100,
            // monitorValid: true,
            getFieldValues: function (dirtyOnly) {
                // Override Ext.form.FormPanel implementation to check submitValue
                let o = {}, n, key, val;
                this.items.each(function(f) {
                    if (f.submitValue !== false && !f.disabled && (dirtyOnly !== true || f.isDirty())) {
                        n = f.getName()
                        key = o[n]
                        val = f.getValue()   
                        if (Ext.isDefined(key)){
                            if (Ext.isArray(key)){
                                o[n].push(val);
                            } else {
                                o[n] = [key, val]
                            }
                        } else {
                            o[n] = val
                        }
                    }
                })
                return o
            },
            items: [
                {
                    xtype: 'fieldset',
                    title: '<b>Collection properties</b>',
                    items: [
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Name',
                            name: 'name',
                            allowBlank: false,
                            anchor:'100%'  // anchor width by percentage
                        },{
                            xtype: 'sm-workflow-combo',
                            fieldLabel: 'Workflow',
                            name: 'workflow',
                            margins: '0 10 0 0',
                            width: 200
                        },{
                            xtype: 'sm-metadata-grid',
                            fieldLabel: 'Metadata',
                            name: 'metadata',
                            anchor: '100%, -56'
                        }
                    ]
                }
            ],
            // buttons: [{
            //     text: this.btnText || 'Save',
            //     formBind: true,
            //     handler: this.btnHandler || function () {}
            // }]
        }
        Ext.apply(this, Ext.apply(this.initialConfig, config))
        SM.CollectionPanel.superclass.initComponent.call(this);
    }
})

Ext.reg('sm-collection-panel', SM.CollectionPanel);