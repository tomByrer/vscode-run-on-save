"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandProcessor = void 0;
const path = require("path");
const vscode = require("vscode");
const util_1 = require("./util");
const minimatch = require("minimatch");
class CommandProcessor {
    constructor() {
        this.commands = [];
    }
    setRawCommands(commands) {
        this.commands = this.processCommands(commands);
    }
    processCommands(commands) {
        return commands.map(command => {
            command.runIn = command.runIn || 'backend';
            return Object.assign({}, command, {
                match: command.match ? new RegExp(command.match, 'i') : undefined,
                notMatch: command.notMatch ? new RegExp(command.notMatch, 'i') : undefined,
                globMatch: command.globMatch ? command.globMatch : undefined
            });
        });
    }
    /** Prepare raw commands to link current working file. */
    prepareCommandsForFileBeforeSaving(filePath) {
        return this.prepareCommandsForFile(filePath, true);
    }
    /** Prepare raw commands to link current working file. */
    prepareCommandsForFileAfterSaving(filePath) {
        return this.prepareCommandsForFile(filePath, false);
    }
    /** Prepare raw commands to link current working file. */
    prepareCommandsForFile(filePath, forCommandsAfterSaving) {
        let filteredCommands = this.filterCommandsFromFilePath(filePath);
        let processedCommands = filteredCommands.map((command) => {
            let commandString = forCommandsAfterSaving
                ? command.commandBeforeSaving
                : command.command;
            if (!commandString) {
                return null;
            }
            if (command.runIn === 'backend') {
                return {
                    runIn: 'backend',
                    command: this.formatVariables(commandString, filePath, true),
                    runningStatusMessage: this.formatVariables(command.runningStatusMessage, filePath),
                    finishStatusMessage: this.formatVariables(command.finishStatusMessage, filePath)
                };
            }
            else if (command.runIn === 'terminal') {
                return {
                    runIn: 'terminal',
                    command: this.formatVariables(commandString, filePath, true)
                };
            }
            else {
                return {
                    runIn: 'vscode',
                    command: this.formatVariables(commandString, filePath, true)
                };
            }
        });
        return processedCommands.filter(v => v);
    }
    filterCommandsFromFilePath(filePath) {
        return this.commands.filter(({ match, notMatch, globMatch }) => {
            if (match && !match.test(filePath)) {
                return false;
            }
            if (notMatch && notMatch.test(filePath)) {
                return false;
            }
            if (globMatch && !minimatch(filePath, globMatch)) {
                return false;
            }
            return true;
        });
    }
    formatVariables(commandOrMessage, filePath, isCommand = false) {
        if (!commandOrMessage) {
            return '';
        }
        // if white spaces in file name or directory name, we need to wrap them in "".
        // we doing this by testing each pieces, and wrap them if needed.
        return commandOrMessage.replace(/\S+/g, (piece) => {
            let oldPiece = piece;
            if (piece[0] === '"' && piece[piece.length - 1] === '"') {
                piece = util_1.decodeQuotedCommandLine(piece.slice(1, -1));
            }
            piece = piece.replace(/\${workspaceFolder}/g, vscode.workspace.rootPath || '');
            piece = piece.replace(/\${workspaceFolderBasename}/g, path.basename(vscode.workspace.rootPath || ''));
            piece = piece.replace(/\${file}/g, filePath);
            piece = piece.replace(/\${fileRightslash}/g, this.rightSlash(filePath));
            piece = piece.replace(/\${fileBasename}/g, path.basename(filePath));
            piece = piece.replace(/\${fileBasenameNoExtension}/g, path.basename(filePath, path.extname(filePath)));
            piece = piece.replace(/\${fileDirname}/g, this.getDirName(filePath));
            piece = piece.replace(/\${fileExtname}/g, path.extname(filePath));
            piece = piece.replace(/\${fileRelative}/g, path.relative(vscode.workspace.rootPath || '', filePath));
            piece = piece.replace(/\${fileRelativeRightslash}/g, this.rightSlash(path.relative(vscode.workspace.rootPath || '', filePath)));
            piece = piece.replace(/\${cwd}/g, process.cwd());
            piece = piece.replace(/\${env\.([\w]+)}/g, (_sub, envName) => {
                return envName ? String(process.env[envName]) : '';
            });
            // If piece includes spaces or `\\`, then it must be encoded
            if (isCommand && piece !== oldPiece && /[\s"]|\\\\/.test(piece)) {
                piece = '"' + util_1.encodeCommandLineToBeQuoted(piece) + '"';
            }
            return piece;
        });
    }
    // `path.dirname` can't handle `\\dir\name`
    getDirName(filePath) {
        let dir = filePath.replace(/[\\\/][^\\\/]+$/, '');
        if (!dir) {
            dir = filePath[0] || '';
        }
        return dir;
    }
    rightSlash(filePath) {
        let dir = filePath.replace(/\\/g, '/');
        if (!dir) {
            dir = filePath[0] || '';
        }
        return dir;
    }
}
exports.CommandProcessor = CommandProcessor;
//# sourceMappingURL=command-processor.js.map
