"""
SkinScan project package.

Configure PyMySQL as MySQLdb replacement for Django MySQL support.
"""
import pymysql

pymysql.install_as_MySQLdb()
