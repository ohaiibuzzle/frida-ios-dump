Module.ensureInitialized('Foundation');

var O_RDONLY = 0;
var O_WRONLY = 1;
var O_RDWR = 2;
var O_CREAT = 512;

var SEEK_SET = 0;
var SEEK_CUR = 1;
var SEEK_END = 2;


function freeze() {
    for (let { id } of Process.enumerateThreads())
        new NativeFunction(Module.findExportByName(
            'libsystem_kernel.dylib', 'thread_suspend'), 'pointer', ['uint'])(id);
}

function unfreeze() {
    for (let { id } of Process.enumerateThreads())
        new NativeFunction(Module.findExportByName(
            'libsystem_kernel.dylib', 'thread_resume'), 'pointer', ['uint'])(id);
}

function allocStr(str) {
    return Memory.allocUtf8String(str);
}

function putStr(addr, str) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    return Memory.writeUtf8String(addr, str);
}

function getByteArr(addr, l) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    return Memory.readByteArray(addr, l);
}

function getU8(addr) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    return Memory.readU8(addr);
}

function putU8(addr, n) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    return Memory.writeU8(addr, n);
}

function getU16(addr) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    return Memory.readU16(addr);
}

function putU16(addr, n) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    return Memory.writeU16(addr, n);
}

function getU32(addr) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    return Memory.readU32(addr);
}

function putU32(addr, n) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    return Memory.writeU32(addr, n);
}

function getU64(addr) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    return Memory.readU64(addr);
}

function putU64(addr, n) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    return Memory.writeU64(addr, n);
}

function getPt(addr) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    return Memory.readPointer(addr);
}

function putPt(addr, n) {
    if (typeof addr == "number") {
        addr = ptr(addr);
    }
    if (typeof n == "number") {
        n = ptr(n);
    }
    return Memory.writePointer(addr, n);
}

function malloc(size) {
    return Memory.alloc(size);
}

function getExportFunction(type, name, ret, args) {
    var nptr;
    nptr = Module.findExportByName(null, name);
    if (nptr === null) {
        console.log("cannot find " + name);
        return null;
    } else {
        if (type === "f") {
            var funclet = new NativeFunction(nptr, ret, args);
            if (typeof funclet === "undefined") {
                console.log("parse error " + name);
                return null;
            }
            return funclet;
        } else if (type === "d") {
            var datalet = Memory.readPointer(nptr);
            if (typeof datalet === "undefined") {
                console.log("parse error " + name);
                return null;
            }
            return datalet;
        }
    }
}

var NSSearchPathForDirectoriesInDomains = getExportFunction("f", "NSSearchPathForDirectoriesInDomains", "pointer", ["int", "int", "int"]);
var wrapper_open = getExportFunction("f", "open", "int", ["pointer", "int", "int"]);
var read = getExportFunction("f", "read", "int", ["int", "pointer", "int"]);
var write = getExportFunction("f", "write", "int", ["int", "pointer", "int"]);
var lseek = getExportFunction("f", "lseek", "int64", ["int", "int64", "int"]);
var close = getExportFunction("f", "close", "int", ["int"]);
var remove = getExportFunction("f", "remove", "int", ["pointer"]);
var access = getExportFunction("f", "access", "int", ["pointer", "int"]);
var dlopen = getExportFunction("f", "dlopen", "pointer", ["pointer", "int"]);

function getDocumentDir() {
    var NSDocumentDirectory = 9;
    var NSUserDomainMask = 1;
    var npdirs = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, 1);
    return ObjC.Object(npdirs).objectAtIndex_(0).toString();
}

function open(pathname, flags, mode) {
    if (typeof pathname == "string") {
        pathname = allocStr(pathname);
    }
    return wrapper_open(pathname, flags, mode);
}

var modules = null;
function getAllAppModules() {
    modules = new Array();
    var tmpmods = Process.enumerateModulesSync();
    for (var i = 0; i < tmpmods.length; i++) {
        if (tmpmods[i].path.indexOf(".app") != -1) {
            modules.push(tmpmods[i]);
        }
    }
    return modules;
}

var FAT_MAGIC = 0xcafebabe;
var FAT_CIGAM = 0xbebafeca;
var MH_MAGIC = 0xfeedface;
var MH_CIGAM = 0xcefaedfe;
var MH_MAGIC_64 = 0xfeedfacf;
var MH_CIGAM_64 = 0xcffaedfe;
var LC_SEGMENT = 0x1;
var LC_SEGMENT_64 = 0x19;
var LC_ENCRYPTION_INFO = 0x21;
var LC_ENCRYPTION_INFO_64 = 0x2C;

function pad(str, n) {
    return Array(n - str.length + 1).join("0") + str;
}

function swap32(value) {
    value = pad(value.toString(16), 8)
    var result = "";
    for (var i = 0; i < value.length; i = i + 2) {
        result += value.charAt(value.length - i - 2);
        result += value.charAt(value.length - i - 1);
    }
    return parseInt(result, 16)
}

function dumpModule(name) {
    if (modules == null) {
        modules = getAllAppModules();
    }

    var targetmod = null;
    for (var i = 0; i < modules.length; i++) {
        if (modules[i].path.indexOf(name) != -1) {
            targetmod = modules[i];
            break;
        }
    }
    if (targetmod == null) {
        console.log("Cannot find module");
        return;
    }
    var modbase = modules[i].base;
    var modsize = modules[i].size;
    var newmodname = modules[i].name;
    var newmodpath = getDocumentDir() + "/" + newmodname + ".fid";
    var oldmodpath = modules[i].path;


    if (!access(allocStr(newmodpath), 0)) {
        remove(allocStr(newmodpath));
    }

    var fmodule = open(newmodpath, O_CREAT | O_RDWR, 0);
    var foldmodule = open(oldmodpath, O_RDONLY, 0);

    if (fmodule == -1 || foldmodule == -1) {
        console.log("Cannot open file" + newmodpath);
        return;
    }

    var is64bit = false;
    var size_of_mach_header = 0;
    var magic = getU32(modbase);
    var cur_cpu_type = getU32(modbase.add(4));
    var cur_cpu_subtype = getU32(modbase.add(8));
    if (magic == MH_MAGIC || magic == MH_CIGAM) {
        is64bit = false;
        size_of_mach_header = 28;
    } else if (magic == MH_MAGIC_64 || magic == MH_CIGAM_64) {
        is64bit = true;
        size_of_mach_header = 32;
    }

    var BUFSIZE = 4096;
    var buffer = malloc(BUFSIZE);

    read(foldmodule, buffer, BUFSIZE);

    var fileoffset = 0;
    var filesize = 0;
    magic = getU32(buffer);
    if (magic == FAT_CIGAM || magic == FAT_MAGIC) {
        var off = 4;
        var archs = swap32(getU32(buffer.add(off)));
        for (var i = 0; i < archs; i++) {
            var cputype = swap32(getU32(buffer.add(off + 4)));
            var cpusubtype = swap32(getU32(buffer.add(off + 8)));
            if (cur_cpu_type == cputype && cur_cpu_subtype == cpusubtype) {
                fileoffset = swap32(getU32(buffer.add(off + 12)));
                filesize = swap32(getU32(buffer.add(off + 16)));
                break;
            }
            off += 20;
        }

        if (fileoffset == 0 || filesize == 0)
            return;

        lseek(fmodule, 0, SEEK_SET);
        lseek(foldmodule, fileoffset, SEEK_SET);
        for (var i = 0; i < parseInt(filesize / BUFSIZE); i++) {
            read(foldmodule, buffer, BUFSIZE);
            write(fmodule, buffer, BUFSIZE);
        }
        if (filesize % BUFSIZE) {
            read(foldmodule, buffer, filesize % BUFSIZE);
            write(fmodule, buffer, filesize % BUFSIZE);
        }
    } else {
        var readLen = 0;
        lseek(foldmodule, 0, SEEK_SET);
        lseek(fmodule, 0, SEEK_SET);
        while (readLen = read(foldmodule, buffer, BUFSIZE)) {
            write(fmodule, buffer, readLen);
        }
    }

    var ncmds = getU32(modbase.add(16));
    var off = size_of_mach_header;
    var offset_cryptid = -1;
    var crypt_off = 0;
    var crypt_size = 0;
    var segments = [];
    for (var i = 0; i < ncmds; i++) {
        var cmd = getU32(modbase.add(off));
        var cmdsize = getU32(modbase.add(off + 4));
        if (cmd == LC_ENCRYPTION_INFO || cmd == LC_ENCRYPTION_INFO_64) {
            offset_cryptid = off + 16;
            crypt_off = getU32(modbase.add(off + 8));
            crypt_size = getU32(modbase.add(off + 12));
        }
        off += cmdsize;
    }

    if (offset_cryptid != -1) {
        var tpbuf = malloc(8);
        putU64(tpbuf, 0);
        lseek(fmodule, offset_cryptid, SEEK_SET);
        write(fmodule, tpbuf, 4);
        lseek(fmodule, crypt_off, SEEK_SET);
        write(fmodule, modbase.add(crypt_off), crypt_size);
    }

    close(fmodule);
    close(foldmodule);
    return newmodpath
}


function walkDylibs(app_path, dirBlacklist) {
    console.log("walking dylibs at " + app_path + " with blacklist " + dirBlacklist.toString());
    var defaultManager = ObjC.classes.NSFileManager.defaultManager();
    var enumerator = defaultManager.enumeratorAtPath_(app_path);
    var dylibs = [];
    var frameworks = [];

    var path;
    while (path = enumerator.nextObject()) {
        // console.log("path: " + path.toString());
        for (var dir in dirBlacklist) {
            if (path.toString().indexOf(dirBlacklist[dir]) != -1) {
                console.log("Skipping " + path.toString() + " because it is in blacklist");
                enumerator.skipDescendants();
                continue;
            }
        }

        if (path.hasSuffix_(".bundle") ||
            path.hasSuffix_(".momd") ||
            path.hasSuffix_(".strings") ||
            path.hasSuffix_(".appex") ||
            path.hasSuffix_(".app") ||
            path.hasSuffix_(".lproj") ||
            path.hasSuffix_(".storyboardc")) {
            enumerator.skipDescendants();
            continue;
            };

        if (path.pathExtension() == "dylib") {
            dylibs.push(path);
        } else if (path.pathExtension() == "framework") {
            frameworks.push(path);
        }
    }
    return [dylibs, frameworks];
}

function loadAllDynamicLibrary2(app_path, dirBlacklist) {
    // freeze();
    var dylibs = [];
    var frameworks = [];

    var walkResult = walkDylibs(app_path, dirBlacklist);
    dylibs = walkResult[0];
    frameworks = walkResult[1];

    for (var i = 0; i < frameworks.length; i++) {
        var bundle = ObjC.classes.NSBundle.bundleWithPath_(app_path + "/" + frameworks[i]);
        if (bundle.isLoaded()) {
            console.log("[frida-ios-dump]: " + bundle.bundlePath() + " has been loaded. ");
        } else {
            if (bundle.load()) {
                console.log("[frida-ios-dump]: Load " + bundle.bundlePath() + " success. ");
            } else {
                console.log("[frida-ios-dump]: Load " + bundle.bundlePath() + " failed. ");
            }
        }
    }
    for (var i = 0; i < dylibs.length; i++) {
        var file_path = dylibs[i];
        var file_name = file_path.lastPathComponent();
        var is_loaded = 0;
        for (var j = 0; j < modules.length; j++) {
            if (modules[j].path.indexOf(file_name) != -1) {
                is_loaded = 1;
                console.log("[frida-ios-dump]: " + file_name + " has been dlopen.");
                break;
            }
        }

        if (!is_loaded) {
            try {
                if (dlopen(allocStr(file_path.UTF8String()), 9)) {
                    console.log("[frida-ios-dump]: dlopen " + file_name + " success. ");
                } else {
                    console.log("[frida-ios-dump]: dlopen " + file_name + " failed. ");
                }
            } catch (e) {
                // Try again
                try {
                    if (dlopen(allocStr(file_path.UTF8String()), 9)) {
                        console.log("[frida-ios-dump]: dlopen " + file_name + " success. ");
                    } else {
                        console.log("[frida-ios-dump]: dlopen " + file_name + " failed twice. ");
                    }
                }
                catch (e) {
                    console.log("[frida-ios-dump]: dlopen " + file_name + " massively failed. ");
                }
            }
        }
    }
}

function handleMessage(message) {
    // freeze();
    getAllAppModules();
    var dirBlacklist = message.blacklist;
    var app_path = ObjC.classes.NSBundle.mainBundle().bundlePath();
    loadAllDynamicLibrary2(app_path, dirBlacklist);
    // start dump
    modules = getAllAppModules();
    for (var i = 0; i < modules.length; i++) {
        console.log("start dump " + modules[i].path);
        var result = dumpModule(modules[i].path);
        send({ dump: result, path: modules[i].path });
    }
    send({ app: app_path.toString() });
    send({ done: "ok" });
    recv(handleMessage);
}

recv(handleMessage);