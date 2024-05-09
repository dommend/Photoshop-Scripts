// Include Photomerge.jsx and related scripts
var runphotomergeFromScript = true;
//@include "Photomerge.jsx"

// Main function to control the workflow
function main() {
    var settings = showDialog();
    if (settings) {
        var baseFolder = new Folder(settings.sourceFolder);
        var outputFolder = new Folder(settings.outputFolder);
        if (!outputFolder.exists) {
            outputFolder.create();
        }
        processFolders(baseFolder, outputFolder, settings);
        alert("All panoramas have been processed and saved successfully."); 
    } else {
        alert("No settings returned from the dialog.");
    }
}

// Show dialog to get user settings
function showDialog() {
    var dialog = new Window("dialog", "Panorama Image Joiner || Beta 0.0001");
    var instructions = "Instructions:\n" +
        "1. Select the folder where the panorama images are located. Each panorama's images should be in their own sub-folder.\n" +
        "2. Select the folder where the panoramas will be saved.\n";
    dialog.add("statictext", undefined, instructions, { multiline: true });

    var sourceFolderLabel = dialog.add("statictext", undefined, "Select Source Folder:");
    var sourceInput = dialog.add("edittext", undefined, "", { multiline: false });
    sourceInput.size = [180, 20];
    dialog.add("button", undefined, "Browse...").onClick = function() {
        var selectedFolder = Folder.selectDialog("Select the source folder");
        if (selectedFolder) sourceInput.text = selectedFolder.fsName;
    };

    var outputFolderLabel = dialog.add("statictext", undefined, "Select Output Folder:");
    var outputInput = dialog.add("edittext", undefined, "", { multiline: false });
    outputInput.size = [180, 20];
    dialog.add("button", undefined, "Browse...").onClick = function() {
        var selectedFolder = Folder.selectDialog("Select the output folder");
        if (selectedFolder) outputInput.text = selectedFolder.fsName;
    };

    var prefixLabel = dialog.add("statictext", undefined, "Enter Filename Prefix:");
    var prefixInput = dialog.add("edittext", undefined, "PANO_");
    prefixInput.size = [180, 20];

    // Merge type and additional options panel
    var mergeTypePanel = dialog.add("panel", undefined, "Merge Type:");
    var autoRadio = mergeTypePanel.add("radiobutton", undefined, "Auto");
    var prspRadio = mergeTypePanel.add("radiobutton", undefined, "Perspective");
    var cylindricalRadio = mergeTypePanel.add("radiobutton", undefined, "Cylindrical");
    var sphericalRadio = mergeTypePanel.add("radiobutton", undefined, "Spherical");

    // Dialog buttons
    var buttonGroup = dialog.add("group");
    buttonGroup.add("button", undefined, "OK").onClick = function() {
        dialog.close(1);
    };
    buttonGroup.add("button", undefined, "Cancel").onClick = function() {
        dialog.close(2);
    };

    if (dialog.show() === 1) {
        var mergeType = "Auto"; // Default to Auto
        if (prspRadio.value) mergeType = "Prsp";
        else if (cylindricalRadio.value) mergeType = "cylindrical";
        else if (sphericalRadio.value) mergeType = "spherical";

        return {
            sourceFolder: sourceInput.text,
            outputFolder: outputInput.text,
            mergeType: mergeType,
            prefix: prefixInput.text
        };
    }
    return null;
}


// Process each folder found in the base folder
function processFolders(baseFolder, outputFolder, settings) {
    var folders = baseFolder.getFiles(function(f) { return f instanceof Folder; });
    for (var i = 0; i < folders.length; i++) {
        var folder = folders[i];
        var files = folder.getFiles(/\.(jpg|jpeg|tif|tiff|psd|png)$/i);
        if (files.length > 0) {
            createPanorama(folder, files, outputFolder, settings);
        }
    }
}

// Create the panorama using the selected files and settings
function createPanorama(sourceFolder, files, outputFolder, settings) {
    var initialDocs = app.documents.length; 

    try {
        var fileArray = [];
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            fileArray.push(file);
            var openedFile = app.open(file);
            var openedDoc = app.activeDocument;
            openedDoc.selection.selectAll();
            openedDoc.selection.copy();
            if (i === 0) {
                app.documents.add(openedDoc.width, openedDoc.height);
            }
            app.activeDocument.paste();
            openedDoc.close(SaveOptions.DONOTSAVECHANGES);
        }

        if (fileArray.length > 0) {
            photomerge.alignmentKey = settings.mergeType;
            photomerge.advancedBlending = true;
            photomerge.lensCorrection = true;
            photomerge.removeVignette = true;
            photomerge.createPanorama(fileArray, false);
        } else {
            throw new Error("No images found to create the panorama.");
        }

        var finalDoc = app.activeDocument;
        var filename = settings.prefix + sourceFolder.name + ".jpg";
        var saveFile = new File(outputFolder + "/" + filename);
        var saveOptions = new JPEGSaveOptions();
        saveOptions.quality = 12;
        finalDoc.saveAs(saveFile, saveOptions, true, Extension.LOWERCASE);

    } catch (e) {
        alert("An error occurred during the panorama creation: " + e);
    } finally {
        while (app.documents.length > initialDocs) {
            app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
        }
    }
}

main();
