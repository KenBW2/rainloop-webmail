
(function () {

	'use strict';

	var
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		Settings = require('Storage/Settings'),
		Data = require('Storage/App/Data'),
		Cache = require('Storage/App/Cache'),
		Remote = require('Storage/App/Remote'),
		Local = require('Storage/Local')
	;

	/**
	 * @constructor
	 */
	function FoldersAppSetting()
	{
		this.foldersListError = Data.foldersListError;
		this.folderList = Data.folderList;

		this.processText = ko.computed(function () {

			var
				bLoading = Data.foldersLoading(),
				bCreating = Data.foldersCreating(),
				bDeleting = Data.foldersDeleting(),
				bRenaming = Data.foldersRenaming()
			;

			if (bCreating)
			{
				return Utils.i18n('SETTINGS_FOLDERS/CREATING_PROCESS');
			}
			else if (bDeleting)
			{
				return Utils.i18n('SETTINGS_FOLDERS/DELETING_PROCESS');
			}
			else if (bRenaming)
			{
				return Utils.i18n('SETTINGS_FOLDERS/RENAMING_PROCESS');
			}
			else if (bLoading)
			{
				return Utils.i18n('SETTINGS_FOLDERS/LOADING_PROCESS');
			}

			return '';

		}, this);

		this.visibility = ko.computed(function () {
			return '' === this.processText() ? 'hidden' : 'visible';
		}, this);

		this.folderForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.deleteAccess(false);
				}
			}, function (oNext) {
				if (oNext)
				{
					oNext.deleteAccess(true);
				}
			}
		]});

		this.folderForEdit = ko.observable(null).extend({'toggleSubscribe': [this,
			function (oPrev) {
				if (oPrev)
				{
					oPrev.edited(false);
				}
			}, function (oNext) {
				if (oNext && oNext.canBeEdited())
				{
					oNext.edited(true);
				}
			}
		]});

		this.useImapSubscribe = !!Settings.settingsGet('UseImapSubscribe');
	}

	FoldersAppSetting.prototype.folderEditOnEnter = function (oFolder)
	{
		var
			sEditName = oFolder ? Utils.trim(oFolder.nameForEdit()) : ''
		;

		if ('' !== sEditName && oFolder.name() !== sEditName)
		{
			Local.set(Enums.ClientSideKeyName.FoldersLashHash, '');

			Data.foldersRenaming(true);
			Remote.folderRename(function (sResult, oData) {

				Data.foldersRenaming(false);
				if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
				{
					Data.foldersListError(
						oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_RENAME_FOLDER'));
				}

				require('App/App').folders();

			}, oFolder.fullNameRaw, sEditName);

			Cache.removeFolderFromCacheList(oFolder.fullNameRaw);

			oFolder.name(sEditName);
		}

		oFolder.edited(false);
	};

	FoldersAppSetting.prototype.folderEditOnEsc = function (oFolder)
	{
		if (oFolder)
		{
			oFolder.edited(false);
		}
	};

	FoldersAppSetting.prototype.onShow = function ()
	{
		Data.foldersListError('');
	};

	FoldersAppSetting.prototype.createFolder = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/FolderCreate'));
	};

	FoldersAppSetting.prototype.systemFolder = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/FolderSystem'));
	};

	FoldersAppSetting.prototype.deleteFolder = function (oFolderToRemove)
	{
		if (oFolderToRemove && oFolderToRemove.canBeDeleted() && oFolderToRemove.deleteAccess() &&
			0 === oFolderToRemove.privateMessageCountAll())
		{
			this.folderForDeletion(null);

			var
				fRemoveFolder = function (oFolder) {

					if (oFolderToRemove === oFolder)
					{
						return true;
					}

					oFolder.subFolders.remove(fRemoveFolder);
					return false;
				}
			;

			if (oFolderToRemove)
			{
				Local.set(Enums.ClientSideKeyName.FoldersLashHash, '');

				Data.folderList.remove(fRemoveFolder);

				Data.foldersDeleting(true);
				Remote.folderDelete(function (sResult, oData) {

					Data.foldersDeleting(false);
					if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
					{
						Data.foldersListError(
							oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_DELETE_FOLDER'));
					}

					require('App/App').folders();

				}, oFolderToRemove.fullNameRaw);

				Cache.removeFolderFromCacheList(oFolderToRemove.fullNameRaw);
			}
		}
		else if (0 < oFolderToRemove.privateMessageCountAll())
		{
			Data.foldersListError(Utils.getNotification(Enums.Notification.CantDeleteNonEmptyFolder));
		}
	};

	FoldersAppSetting.prototype.subscribeFolder = function (oFolder)
	{
		Local.set(Enums.ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, true);

		oFolder.subScribed(true);
	};

	FoldersAppSetting.prototype.unSubscribeFolder = function (oFolder)
	{
		Local.set(Enums.ClientSideKeyName.FoldersLashHash, '');
		Remote.folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, false);

		oFolder.subScribed(false);
	};

	module.exports = FoldersAppSetting;

}());